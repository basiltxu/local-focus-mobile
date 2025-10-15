

'use client';

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { format } from "date-fns";
import { CategoryIcon } from "@/components/icons";
import PageHeader from "@/components/page-header";
import { Calendar, MapPin, Tag, Eye, ShieldCheck, TrendingUp, Edit, User, Clock } from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Incident, Category, SubCategory } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { IncidentStatusBadge } from "@/components/incidents/IncidentStatusBadge";

export default function IncidentDetailPageClient({ id }: { id: string }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [subCategory, setSubCategory] = useState<SubCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const incidentDocRef = doc(db, "incidents", id);
    const unsubscribe = onSnapshot(incidentDocRef, async (incidentSnap) => {
      if (!incidentSnap.exists()) {
        notFound();
        return;
      }
      
      const incidentData = { 
          id: incidentSnap.id, 
          ...incidentSnap.data(),
          createdAt: incidentSnap.data().createdAt.toDate(),
          updatedAt: incidentSnap.data().updatedAt.toDate(),
      } as Incident;
      setIncident(incidentData);

      if (incidentData.categoryId) {
        const categoryDocRef = doc(db, "categories", incidentData.categoryId);
        const categorySnap = await getDoc(categoryDocRef);
        if (categorySnap.exists()) {
          const categoryData = { id: categorySnap.id, ...categorySnap.data() } as Category;
          setCategory(categoryData);
          if(incidentData.subCategoryId) {
              const subCategoryDocRef = doc(db, "categories", incidentData.categoryId, "subcategories", incidentData.subCategoryId);
              const subCategorySnap = await getDoc(subCategoryDocRef);
              if(subCategorySnap.exists()){
                  setSubCategory({id: subCategorySnap.id, ...subCategorySnap.data()} as SubCategory);
              }
          }
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching incident:", error);
      setIsLoading(false);
      notFound();
    });
    
    return () => unsubscribe();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <Card>
            <Skeleton className="w-full h-96" />
            <CardHeader>
                <Skeleton className="h-10 w-3/4 mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  const placeholderImage = PlaceHolderImages.find(p => p.id === incident.imageId);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Incident Details"
        description={`Report #${incident.id}`}
        showBackButton
      />

      <Card className="overflow-hidden">
        {placeholderImage && (
            <div className="relative w-full h-64 sm:h-80 md:h-96">
                <Image
                    src={placeholderImage.imageUrl}
                    alt={incident.title}
                    fill
                    className="object-cover"
                    data-ai-hint={placeholderImage.imageHint}
                />
            </div>
        )}
        <CardHeader>
          <CardTitle className="text-3xl font-headline">
            {incident.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(incident.createdAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{incident.location}</span>
            </div>
            {category && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>{category.name}{subCategory && `: ${subCategory.name}`}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <Card className="p-3">
                    <CardHeader className="p-0 mb-1"><ShieldCheck className="mx-auto h-6 w-6 text-muted-foreground" /></CardHeader>
                    <CardDescription className="text-xs">Status</CardDescription>
                    <IncidentStatusBadge status={incident.status} />
                </Card>
                 <Card className="p-3">
                    <CardHeader className="p-0 mb-1"><TrendingUp className="mx-auto h-6 w-6 text-muted-foreground" /></CardHeader>
                    <CardDescription className="text-xs">Impact</CardDescription>
                    <p className="font-semibold capitalize">{incident.impactStatus}</p>
                </Card>
                 <Card className="p-3">
                    <CardHeader className="p-0 mb-1"><Eye className="mx-auto h-6 w-6 text-muted-foreground" /></CardHeader>
                    <CardDescription className="text-xs">Visibility</CardDescription>
                    <p className="font-semibold capitalize">{incident.visibility}</p>
                </Card>
                {category && (
                    <Card className="p-3">
                        <CardHeader className="p-0 mb-1"><CategoryIcon categoryName={category.name} className="mx-auto h-6 w-6 text-muted-foreground"/></CardHeader>
                        <CardDescription className="text-xs">Category</CardDescription>
                        <p className="font-semibold">{category.name}</p>
                    </Card>
                )}
            </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-foreground/80 whitespace-pre-wrap">{incident.description}</p>
          </div>

          {(incident.editorialNotes || incident.approvedBy || incident.publishedBy) && (
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-xl">Editorial Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {incident.editorialNotes && (
                        <div className="flex items-start gap-3">
                            <Edit className="h-4 w-4 mt-1 text-muted-foreground"/>
                            <div>
                                <h4 className="font-semibold">Internal Notes</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{incident.editorialNotes}</p>
                            </div>
                        </div>
                    )}
                     {incident.approvedBy && incident.approvedAt && (
                        <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-1 text-muted-foreground"/>
                            <div>
                                <h4 className="font-semibold">Approved By</h4>
                                <p className="text-muted-foreground">User ID: {incident.approvedBy}</p>
                                <p className="text-xs text-muted-foreground/80">On: {format(incident.approvedAt.toDate(), "PPP p")}</p>
                            </div>
                        </div>
                    )}
                     {incident.publishedBy && incident.publishedAt && (
                        <div className="flex items-start gap-3">
                            <Clock className="h-4 w-4 mt-1 text-muted-foreground"/>
                             <div>
                                <h4 className="font-semibold">Published By</h4>
                                <p className="text-muted-foreground">User ID: {incident.publishedBy}</p>
                                <p className="text-xs text-muted-foreground/80">On: {format(incident.publishedAt.toDate(), "PPP p")}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
