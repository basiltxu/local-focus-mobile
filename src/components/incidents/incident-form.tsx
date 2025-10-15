

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import type { Incident, Category, SubCategory, Location, Timestamp, IncidentStatus, Visibility } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp, query, onSnapshot, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { incidentFormSchema } from "@/lib/schemas/incident";
import { collections } from "@/lib/paths";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

type IncidentFormProps = {
  incident?: Incident;
  onSuccess?: (incidentId?: string) => void;
  defaultStatus?: IncidentStatus;
  defaultVisibility?: Visibility;
}

export function IncidentForm({ incident, onSuccess, defaultStatus, defaultVisibility }: IncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isLFPrivileged } = useCurrentUserRole();
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [locations, setLocations] = useState<Location[]>([]);

  const isEditMode = !!incident;
  
  const form = useForm<z.infer<typeof incidentFormSchema>>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      countryId: "palestine",
      regionOrDistrictId: "",
      governorateId: "",
      cityId: "",
      categoryId: "",
      subCategoryId: "",
      impactStatus: "low",
      editorialNotes: "",
    },
  });
  
  const selectedCountryId = form.watch("countryId");
  const selectedRegionOrDistrictId = form.watch("regionOrDistrictId");
  const selectedGovernorateId = form.watch("governorateId");
  const selectedCategoryId = form.watch("categoryId");

  // Location filtering logic
  const countries = useMemo(() => locations.filter(l => l.type === 'country'), [locations]);
  const regionsAndDistricts = useMemo(() => {
    if (!selectedCountryId) return [];
    return locations.filter(l => (l.type === 'region' || l.type === 'district') && l.parentId === selectedCountryId);
  }, [locations, selectedCountryId]);

  const governorates = useMemo(() => {
    if (!selectedRegionOrDistrictId || selectedCountryId !== 'palestine') return [];
    return locations.filter(l => l.type === 'governorate' && l.parentId === selectedRegionOrDistrictId);
  }, [locations, selectedCountryId, selectedRegionOrDistrictId]);

  const cities = useMemo(() => {
    let parentId: string | undefined;
    if (selectedCountryId === 'israel') {
        parentId = selectedRegionOrDistrictId;
    } else if (selectedCountryId === 'palestine') {
        parentId = selectedGovernorateId || selectedRegionOrDistrictId;
    }
    if (!parentId) return [];
    return locations.filter(l => ['city', 'village', 'refugee_camp', 'settlement'].includes(l.type) && l.parentId === parentId);
  }, [locations, selectedCountryId, selectedRegionOrDistrictId, selectedGovernorateId]);


  useEffect(() => {
    if(!user || !user.organizationId) return;
    
    const locationsQuery = query(collection(db, collections.locations));
    const unsubLocations = onSnapshot(locationsQuery, (snapshot) => {
        const locationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
        setLocations(locationData);
    }, (error) => {
      console.error("Error fetching locations:", error);
      toast({ title: 'Error', description: 'Could not fetch locations.' });
    });
    
    // Correctly fetch categories: user's org + Local Focus org
    const orgIds = [user.organizationId, "LOCAL_FOCUS_ORG_ID"];
    const uniqueOrgIds = [...new Set(orgIds.filter(Boolean))]; // Remove nulls/undefined and duplicates
    
    const categoriesQuery = query(
      collection(db, collections.categories),
      where("organizationId", "in", uniqueOrgIds)
    );

    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setAllCategories(categoriesData);

        // Pre-fill form if editing
        if (isEditMode && incident) {
            const pathParts = incident.fullLocationPath?.split('/') || [];
            form.reset({
              title: incident.title,
              description: incident.description,
              impactStatus: incident.impactStatus,
              categoryId: incident.categoryId,
              subCategoryId: incident.subCategoryId || "",
              countryId: pathParts[0] || 'palestine',
              regionOrDistrictId: pathParts[1] || '',
              governorateId: pathParts[2] || '',
              cityId: incident.locationId || '',
              editorialNotes: incident.editorialNotes || "",
            });
        }
    }, (error) => {
      console.error("Error fetching categories:", error);
      toast({ title: 'Error', description: 'Could not fetch categories.' });
    });

    return () => {
        unsubLocations();
        unsubCategories();
    };
  }, [isEditMode, incident, form, user, toast]);
  
  useEffect(() => {
      const fetchSubCategories = (categoryId: string) => {
        if (!categoryId) {
            setSubCategories([]);
            return;
        }
        const subCategoriesQuery = query(collection(db, "categories", categoryId, "subcategories"));
        const unsubscribe = onSnapshot(subCategoriesQuery, (snapshot) => {
            const subCategoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubCategory));
            setSubCategories(subCategoriesData);
        }, (e) => {
            console.error("Error fetching sub-categories:", e);
            toast({ title: 'Error', description: 'Could not fetch sub-categories.' });
            setSubCategories([]);
        });
        return unsubscribe;
    }
    const unsubscribe = fetchSubCategories(selectedCategoryId);
    return () => unsubscribe?.();
  }, [selectedCategoryId, toast]);

  async function onSubmit(values: z.infer<typeof incidentFormSchema>) {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to manage incidents.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    
    const locationString: string = [countries.find(c => c.id === values.countryId)?.name, regionsAndDistricts.find(r => r.id === values.regionOrDistrictId)?.name, governorates.find(g => g.id === values.governorateId)?.name, cities.find(c => c.id === values.cityId)?.name].filter(Boolean).join(' / ');
    const fullLocationPath = [values.countryId, values.regionOrDistrictId, values.governorateId, values.cityId].filter(Boolean).join('/');
    
    // Base data for both create and update
    const incidentData = {
        title: values.title,
        description: values.description,
        location: locationString,
        locationId: values.cityId,
        fullLocationPath: fullLocationPath,
        categoryId: values.categoryId,
        subCategoryId: values.subCategoryId || null,
        impactStatus: values.impactStatus,
        editorialNotes: values.editorialNotes || null,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
    };

    try {
        let newIncidentId;
        if (isEditMode && incident) {
            const incidentRef = doc(db, collections.incidents, incident.id);
            await updateDoc(incidentRef, incidentData as any);
            toast({ title: "Incident Updated", description: `The incident has been successfully updated.`});
            newIncidentId = incident.id;
        } else {
            const createData = {
              ...incidentData,
              createdBy: user.uid,
              organizationId: user.organizationId || null,
              createdAt: serverTimestamp(),
              status: defaultStatus || (isLFPrivileged ? 'Draft' : 'Review'),
              visibility: defaultVisibility || 'private',
              imageId: 'placeholder',
              coordinates: { lat: 31.7683, lng: 35.2137 },
              statusHistory: [],
            }
            const incidentsRef = collection(db, collections.incidents);
            const newIncidentRef = await addDoc(incidentsRef, createData as any);
            toast({ title: "Incident Reported", description: `Your report has been submitted.`});
            newIncidentId = newIncidentRef.id;
        }
        
        if(onSuccess) onSuccess(newIncidentId);

    } catch (e: any) {
        console.error("Error saving incident:", e);
        toast({
            title: isEditMode ? 'Update Failed' : 'Creation Failed',
            description: e.message || 'Could not save the incident. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="incident-form">
        
        {isEditMode && !isLFPrivileged && incident?.status !== 'Draft' && (
            <Alert variant="destructive">
                <AlertDescription>This incident has been submitted and can no longer be edited.</AlertDescription>
            </Alert>
        )}

        <fieldset disabled={isSubmitting || (isEditMode && incident?.status === 'Closed')}>
            <div className="space-y-8">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Roadblock on Main Street" {...field} data-testid="incident-form-title" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Provide a detailed description of the incident."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="incident-form-description"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="countryId" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('regionOrDistrictId', ''); form.setValue('governorateId', ''); form.setValue('cityId', ''); }} value={field.value} >
                        <FormControl><SelectTrigger data-testid="incident-form-country"><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {countries.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>

                <FormField control={form.control} name="regionOrDistrictId" render={({ field }) => (
                    <FormItem>
                    <FormLabel>{selectedCountryId === 'israel' ? 'District' : 'Region'}</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('governorateId', ''); form.setValue('cityId', ''); }} value={field.value} disabled={!selectedCountryId || regionsAndDistricts.length === 0} >
                        <FormControl><SelectTrigger data-testid="incident-form-region"><SelectValue placeholder={`Select a ${selectedCountryId === 'israel' ? 'district' : 'region'}`} /></SelectTrigger></FormControl>
                        <SelectContent>
                        {regionsAndDistricts.map(r => <SelectItem key={r.id} value={r.id!}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                
                {selectedCountryId === 'palestine' && (
                    <FormField control={form.control} name="governorateId" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Governorate</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); form.setValue('cityId', ''); }} value={field.value} disabled={!selectedRegionOrDistrictId || governorates.length === 0} >
                            <FormControl><SelectTrigger data-testid="incident-form-governorate"><SelectValue placeholder="Select a governorate" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {governorates.map(g => <SelectItem key={g.id} value={g.id!}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    )}

                <FormField control={form.control} name="cityId" render={({ field }) => (
                    <FormItem>
                    <FormLabel>City / Area</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={cities.length === 0}>
                        <FormControl><SelectTrigger data-testid="incident-form-city"><SelectValue placeholder="Select a city/area" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); form.setValue("subCategoryId", ""); }} value={field.value} >
                        <FormControl>
                            <SelectTrigger data-testid="incident-form-category">
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {allCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="subCategoryId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sub-category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={subCategories.length === 0} >
                        <FormControl>
                            <SelectTrigger data-testid="incident-form-subcategory">
                            <SelectValue placeholder={subCategories.length === 0 ? "No sub-categories" : "Select a sub-category"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {subCategories.map((subCategory) => (
                            <SelectItem key={subCategory.id} value={subCategory.id}>
                                {subCategory.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                
                <FormField control={form.control} name="impactStatus" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Impact Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="incident-form-impact"><SelectValue placeholder="Select impact" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>

                {isLFPrivileged && (
                    <FormField
                        control={form.control}
                        name="editorialNotes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Editorial Notes</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Internal notes for the editorial team."
                                {...field}
                                data-testid="incident-form-editorial-notes"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                control={form.control}
                name="media"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Picture/Video</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/png, image/jpeg, image/jpg" data-testid="incident-form-media" />
                    </FormControl>
                    <FormDescription>
                        Upload a supporting image file (PNG, JPG, JPEG). Max 10MB.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onSuccess ? onSuccess() : router.back()}>Cancel</Button>
            
            <Button type="submit" data-testid="incident-form-submit" disabled={isSubmitting || !form.formState.isValid || (isEditMode && incident?.status === 'Closed')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Submit for Review'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
