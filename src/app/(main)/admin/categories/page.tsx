
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category, SubCategory } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import PageHeader from '@/components/page-header';
import { collections } from '@/lib/paths';

type CategoryWithSubCategories = Category & { subCategories: SubCategory[] };

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const { user, isEditor, isAdmin, isSuperAdmin } = useAuth();
  const canManage = isEditor || isAdmin || isSuperAdmin;

  const [allCategories, setAllCategories] = useState<CategoryWithSubCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for dialogs
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // State for form data
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentSubCategory, setCurrentSubCategory] = useState<SubCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');
  
  // State for deletion
  const [itemToDelete, setItemToDelete] = useState<{type: 'category' | 'subCategory', id: string, name: string, parentId?: string} | null>(null);

  useEffect(() => {
    if (!user || !canManage) {
        setIsLoading(false);
        return;
    };
    
    setIsLoading(true);

    const orgIds = [user.organizationId, "LOCAL_FOCUS_ORG_ID"];
    const uniqueOrgIds = [...new Set(orgIds.filter(Boolean))];

    const categoriesQuery = query(
        collection(db, collections.categories),
        where('organizationId', 'in', uniqueOrgIds),
        orderBy('name', 'asc')
    );

    const unsubscribeCategories = onSnapshot(categoriesQuery, async (querySnapshot) => {
        const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        
        const categoriesWithSubcategories = await Promise.all(
            categoriesData.map(async (cat) => {
                const subcategoriesQuery = query(collection(db, 'categories', cat.id, 'subcategories'), orderBy('name', 'asc'));
                const subSnapshot = await getDocs(subcategoriesQuery);
                const subcategoriesData = subSnapshot.docs.map(subDoc => ({ id: subDoc.id, ...subDoc.data() } as SubCategory));
                return { ...cat, subCategories: subcategoriesData };
            })
        );
        
        setAllCategories(categoriesWithSubcategories);
        setIsLoading(false);

    }, (error) => {
        console.error("Error fetching categories:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'categories', operation: 'list'}));
        setIsLoading(false);
    });

    return () => unsubscribeCategories();
  }, [user, canManage]);
  
  // Open dialogs
  const openNewCategoryDialog = () => {
    setCurrentCategory(null);
    setCategoryName('');
    setIsCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setIsCategoryDialogOpen(true);
  };
  
  const openNewSubCategoryDialog = (category: Category) => {
    setCurrentCategory(category);
    setCurrentSubCategory(null);
    setSubCategoryName('');
    setIsSubCategoryDialogOpen(true);
  };

  const openEditSubCategoryDialog = (subCategory: SubCategory, parentCategory: Category) => {
    setCurrentCategory(parentCategory);
    setCurrentSubCategory(subCategory);
    setSubCategoryName(subCategory.name);
    setIsSubCategoryDialogOpen(true);
  };

  const openDeleteDialog = (type: 'category' | 'subCategory', item: Category | SubCategory, parentId?: string) => {
    setItemToDelete({ type, id: item.id, name: item.name, parentId });
    setIsDeleteDialogOpen(true);
  };

  // CRUD operations
  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !user || !user.organizationId) {
        toast({ title: "Error", description: "Category name and organization are required.", variant: "destructive"});
        return;
    }
    
    const categoryData = { name: categoryName, createdBy: user.uid, organizationId: user.organizationId };

    if (currentCategory) { // Editing
      const categoryRef = doc(db, "categories", currentCategory.id);
      updateDoc(categoryRef, { name: categoryName })
        .then(() => {
          toast({ title: "Category Updated", description: `Category "${categoryName}" has been updated.` });
          setIsCategoryDialogOpen(false);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: `categories/${currentCategory.id}`,
            operation: 'update',
            requestResourceData: { name: categoryName },
          });
          errorEmitter.emit('permission-error', error);
        });
    } else { // Creating
      const categoriesRef = collection(db, "categories");
      addDoc(categoriesRef, categoryData)
        .then(() => {
          toast({ title: "Category Created", description: `Category "${categoryName}" has been created.` });
          setIsCategoryDialogOpen(false);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: 'categories',
            operation: 'create',
            requestResourceData: categoryData,
          });
          errorEmitter.emit('permission-error', error);
        });
    }
  };

  const handleSaveSubCategory = async () => {
    if (!subCategoryName.trim() || !currentCategory || !user) {
        toast({ title: "Error", description: "Sub-category name or parent category is missing.", variant: "destructive"});
        return;
    }
    
    const subCategoryData = { name: subCategoryName, createdBy: user.uid };
    
    if (currentSubCategory) { // Editing
      const subCategoryRef = doc(db, "categories", currentCategory.id, "subcategories", currentSubCategory.id);
      updateDoc(subCategoryRef, { name: subCategoryName })
        .then(() => {
          toast({ title: "Sub-category Updated", description: `Sub-category "${subCategoryName}" has been updated.` });
          setIsSubCategoryDialogOpen(false);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: `categories/${currentCategory.id}/subcategories/${currentSubCategory.id}`,
            operation: 'update',
            requestResourceData: { name: subCategoryName },
          });
          errorEmitter.emit('permission-error', error);
        });
    } else { // Creating
      const subCategoryCollectionRef = collection(db, "categories", currentCategory.id, "subcategories");
      addDoc(subCategoryCollectionRef, subCategoryData)
        .then(() => {
          toast({ title: "Sub-category Created", description: `Sub-category "${subCategoryName}" has been created.` });
          setIsSubCategoryDialogOpen(false);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: `categories/${currentCategory.id}/subcategories`,
            operation: 'create',
            requestResourceData: subCategoryData,
          });
          errorEmitter.emit('permission-error', error);
        });
    }
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'category') {
      const categoryRef = doc(db, "categories", itemToDelete.id);
      deleteDoc(categoryRef)
        .then(() => {
          toast({ title: "Category Deleted", description: `Category "${itemToDelete.name}" deleted. Note: This does not delete its subcategories automatically.` });
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: `categories/${itemToDelete.id}`,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', error);
        });
    } else if (itemToDelete.type === 'subCategory' && itemToDelete.parentId) {
      const subCategoryRef = doc(db, "categories", itemToDelete.parentId, "subcategories", itemToDelete.id);
      deleteDoc(subCategoryRef)
        .then(() => {
          toast({ title: "Deleted", description: `"${itemToDelete.name}" has been deleted.`, variant: "destructive" });
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        })
        .catch(err => {
          const error = new FirestorePermissionError({
            path: `categories/${itemToDelete.parentId}/subcategories/${itemToDelete.id}`,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', error);
        });
    }
  };

  return (
    <main className="flex-1 p-6">
      <PageHeader title="Category Management" description="Manage incident categories and their sub-categories.">
        {canManage && (
            <Button onClick={openNewCategoryDialog}>
                <PlusCircle className="mr-2" /> Add Category
            </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Categories relevant to your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : allCategories.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
                <p>No categories found.</p>
                {canManage && <Button variant="link" onClick={openNewCategoryDialog}>Create the first one</Button>}
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {allCategories.map((cat) => (
                <AccordionItem value={cat.id} key={cat.id}>
                  <div className="flex items-center w-full">
                      <AccordionTrigger className="flex-grow pr-4">
                          <div className="flex items-center gap-3">
                              <span className="font-semibold">{cat.name}</span>
                              <Badge variant="outline">{cat.subCategories?.length || 0} sub-categories</Badge>
                          </div>
                      </AccordionTrigger>
                      {canManage && (
                        <div className="flex items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openEditCategoryDialog(cat)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('category', cat)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                      )}
                  </div>
                  <AccordionContent>
                      <>
                        {canManage && (
                            <div className="flex justify-end mb-2">
                            <Button variant="outline" size="sm" onClick={() => openNewSubCategoryDialog(cat)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-category
                            </Button>
                            </div>
                        )}
                        {cat.subCategories && cat.subCategories.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sub-category Name</TableHead>
                                {canManage && <TableHead className="text-right">Actions</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cat.subCategories.map((subCat) => (
                                <TableRow key={subCat.id}>
                                  <TableCell>{subCat.name}</TableCell>
                                  {canManage && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditSubCategoryDialog(subCat, cat)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('subCategory', subCat, cat.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No sub-categories yet.</p>
                        )}
                      </>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="category-name">Category Name</Label>
            <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sub-category Dialog */}
      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSubCategory ? 'Edit Sub-category' : 'Add New Sub-category'}</DialogTitle>
            {currentCategory && <DialogDescription>For category: {currentCategory.name}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="subcategory-name">Sub-category Name</Label>
            <Input id="subcategory-name" value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handleSaveSubCategory}>Save Sub-category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} 
              "{itemToDelete?.name}".
              {itemToDelete?.type === 'category' && ' This will not delete its sub-categories.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
