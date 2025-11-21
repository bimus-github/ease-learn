"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimTenantInvite } from "@/supabase/servers/admin";
import { teacherRoutes } from "@/constants/routes";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { tenantBrandingSchema } from "@/lib/schemas/tenant";
import type { PlanType } from "@/lib/schemas/tenant";

const onboardingSchema = z
  .object({
    email: z.string().email("Email must be valid"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    displayName: z.string().min(1, "Display name is required"),
    subdomain: z
      .string()
      .min(1, "Subdomain is required")
      .max(63, "Subdomain must be 63 characters or less")
      .regex(
        /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
        "Subdomain must be lowercase alphanumeric with hyphens, not starting or ending with hyphen",
      ),
    tenantName: z.string().min(1, "Tenant name is required"),
    tenantDescription: z.string().min(1, "Tenant description is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type OnboardingFormData = z.infer<typeof onboardingSchema>;

type TenantOnboardingFormProps = {
  token: string;
  inviteEmail: string;
  suggestedSubdomain?: string;
  planType?: PlanType;
  branding?: Record<string, unknown>;
};

export function TenantOnboardingForm({
  token,
  inviteEmail,
  suggestedSubdomain,
  planType,
  branding,
}: TenantOnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    tenantId: string;
    teacherId: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      email: inviteEmail,
      subdomain: suggestedSubdomain || "",
      tenantName: (branding?.name as string) || "",
      tenantDescription: (branding?.description as string) || "",
    },
  });


  const teacherFields: (keyof OnboardingFormData)[] = [
    "firstName",
    "lastName",
    "displayName",
    "email",
    "password",
    "confirmPassword",
  ];

  const tenantFields: (keyof OnboardingFormData)[] = [
    "subdomain",
    "tenantName",
    "tenantDescription",
  ];

  const handleNext = async () => {
    const isValid = await trigger(teacherFields);
    if (isValid) {
      setStep(2);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Workspace Created Successfully!</h2>
        <p className="text-muted-foreground mb-6">
          Your tenant workspace has been set up. Please sign in to access your dashboard.
        </p>
        <Button
          onClick={() => {
            router.push(teacherRoutes.login);
          }}
        >
          Sign In to Dashboard
        </Button>
      </div>
    );
  }

  const onSubmit = (data: OnboardingFormData) => {
    if (step === 1) {
      setStep(2);
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      try {
        const brandingData = tenantBrandingSchema.safeParse({
          name: data.tenantName,
          description: data.tenantDescription,
          entry_content: branding?.entry_content || {},
          logo: branding?.logo || undefined,
        });

        const result = await claimTenantInvite({
          token,
          teacher: {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName,
          },
          tenant: {
            subdomain: data.subdomain.toLowerCase(),
            branding: brandingData.success ? brandingData.data : undefined,
            plan_type: planType,
          },
        });

        if (result.success && result.data) {
          // Auto-sign in the teacher
          const supabase = createClient();
          const password = watch("password");
          const email = watch("email");
          
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // If sign-in fails, still show success but let them sign in manually
            console.error("[onboard] Failed to auto-sign in", signInError);
            setSuccess(result.data);
          } else {
            // Redirect to dashboard on successful sign-in
            router.push(teacherRoutes.dashboard);
          }
        } else {
          setSubmitError(
            result.success === false ? result.error : "Failed to create workspace",
          );
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "An unexpected error occurred",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && step === 1) {
          event.preventDefault();
          handleNext();
        }
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-center gap-2 mb-6">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 1
              ? "bg-primary text-primary-foreground border-primary"
              : "border-muted text-muted-foreground"
          }`}
        >
          1
        </div>
        <div className={`h-1 w-16 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 2
              ? "bg-primary text-primary-foreground border-primary"
              : "border-muted text-muted-foreground"
          }`}
        >
          2
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Teacher Profile</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Set up your account details
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                disabled={isPending}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                disabled={isPending}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              {...register("displayName")}
              disabled={isPending}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email is set from your invitation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              disabled={isPending}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              disabled={isPending}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Tenant Details</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure your workspace
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">
              Subdomain <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                {...register("subdomain")}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setValue("subdomain", value);
                }}
                disabled={isPending}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                .ease-learn.dev
              </span>
            </div>
            {errors.subdomain && (
              <p className="text-sm text-destructive">
                {errors.subdomain.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase alphanumeric with hyphens only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantName">
              Workspace Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenantName"
              {...register("tenantName")}
              disabled={isPending}
            />
            {errors.tenantName && (
              <p className="text-sm text-destructive">
                {errors.tenantName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantDescription">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="tenantDescription"
              {...register("tenantDescription")}
              rows={4}
              disabled={isPending}
            />
            {errors.tenantDescription && (
              <p className="text-sm text-destructive">
                {errors.tenantDescription.message}
              </p>
            )}
          </div>
        </div>
      )}

      {submitError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex justify-between pt-4">
        {step === 2 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            disabled={isPending}
          >
            Back
          </Button>
        )}
        <div className={step === 1 ? "ml-auto" : ""}>
          {step === 1 ? (
            <Button type="button" onClick={handleNext} disabled={isPending}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

