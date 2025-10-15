
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { requestQuote } from '@/app/actions/request-quote';
import { Textarea } from '../ui/textarea';
import { quoteSchema } from '@/lib/schemas';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';

type QuoteRequestFormProps = {
  children: React.ReactNode;
};

const services = [
    { id: 'instantIncidents', label: 'Instant Incidents' },
    { id: 'weeklyReports', label: 'Weekly Reports' },
    { id: 'monthlyReports', label: 'Monthly Reports' },
    { id: 'aiReports', label: 'AI Reports' },
    { id: 'other', label: 'Other' },
] as const;

export function QuoteRequestForm({ children }: QuoteRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Use auth to get org details if logged in

  const form = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      orgName: '',
      contactPerson: user?.name || '',
      contactEmail: user?.email || '',
      contactPhone: '',
      services: {},
      customMessage: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof quoteSchema>) => {
    // If user is not logged in, we can't associate with an org.
    // This form is now more for logged-in users or needs adjustment.
    if (!user || !user.organizationId) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to an organization to request a quote.', variant: 'destructive'});
        return;
    }

    try {
      const result = await requestQuote({
          ...values,
          organizationId: user.organizationId,
          organizationName: user.name, // Or fetch org name if available on user object
          createdBy: user.uid,
          createdByName: user.name,
      });

      if (result.success) {
        toast({
          title: 'Request Submitted',
          description: 'Thank you! We will contact you shortly.',
        });
        setIsOpen(false);
        form.reset();
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      console.error("Error submitting quote request:", e);
      toast({
        title: 'Submission Failed',
        description: e.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Request Services</DialogTitle>
          <DialogDescription>
            Interested in Local Focus for your organization? Fill out the form below and we'll be in touch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[60vh] px-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="orgName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Organization Name</FormLabel>
                                <FormControl><Input placeholder="Your Organization LLC" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="contactPerson" render={({ field }) => (
                                <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <FormField control={form.control} name="contactPhone" render={({ field }) => (
                            <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input placeholder="+1-555-123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>

                        <FormField control={form.control} name="services" render={() => (
                            <FormItem>
                                <div className="mb-4"><FormLabel>Services Interested In</FormLabel></div>
                                <div className="grid grid-cols-2 gap-4">
                                {services.map((item) => (
                                    <FormField key={item.id} control={form.control} name={`services.${item.id}`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )} />
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="customMessage" render={({ field }) => (
                            <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Please describe your needs or use case..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                 </ScrollArea>
                <DialogFooter className="p-6 pt-4 border-t">
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
