"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronDown, Send, Save, ShieldCheck, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface ApiClaim {
  patientMeta: {
    patient?: string;
    mrn?: string;
    provider?: string;
    session?: string;
    payor?: string;
  };
  cptItems: Array<{
    id: string;
    code: string;
    description: string;
    units: string;
    duration: string;
    modifier?: string;
  }>;
  diagnosisCodes: Array<{
    id: string;
    code: string;
    description: string;
    type: string;
  }>;
  claimStatus: "draft" | "verified" | "submitted";
}

export default function ClaimDocument() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const backTab = searchParams.get("tab") || "soap";

  const [claim, setClaim] = useState<ApiClaim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClaim() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.getClaim(sessionId);
        if (res) setClaim(res as ApiClaim);
      } catch (e) {
        console.error("Failed to load claim data", e);
        setError("Failed to load claim from backend.");
      } finally {
        setIsLoading(false);
      }
    }
    loadClaim();
  }, [sessionId]);

  const handleSubmitClaim = async () => {
    try {
      setIsSubmitting(true);
      const updated = await api.submitClaim(sessionId);
      if (updated) setClaim(updated as ApiClaim);
    } catch (e) {
      console.error("Failed to submit claim", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyClaim = async () => {
    try {
      setIsVerifying(true);
      const updated = await api.verifyClaim(sessionId);
      if (updated) setClaim(updated as ApiClaim);
    } catch (e) {
      console.error("Failed to verify claim", e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const updated = await api.saveClaimDraft(sessionId);
      if (updated) setClaim(updated as ApiClaim);
    } catch (e) {
      console.error("Failed to save claim draft", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-medexa-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-medexa-blue" />
        Loading claim document...
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
        <Card className="p-8 max-w-lg rounded-3xl border-medexa-gray-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-medexa-gray-900 mb-3">Claim Unavailable</h1>
          <p className="text-medexa-gray-500 mb-6">{error || "Ensure the backend is running and the session is finalized."}</p>
          <Link href="/">
            <Button className="rounded-full bg-medexa-blue text-white hover:bg-blue-700">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const patientMeta = claim.patientMeta || {};
  const cptItems = claim.cptItems || [];
  const diagnosisCodes = claim.diagnosisCodes || [];

  return (
    <div className="flex flex-col gap-8 pb-24 max-w-[1000px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/session/${sessionId}/documentation?tab=${backTab}`}>
              <Button variant="ghost" size="icon" className="text-medexa-gray-900 rounded-full hover:bg-medexa-gray-100">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-medexa-gray-900 flex items-center gap-3">
              Claim Document
              <Badge className={
                claim.claimStatus === "submitted" ? "bg-medexa-green text-white font-bold border-0" :
                claim.claimStatus === "verified" ? "bg-medexa-blue text-white font-bold border-0" :
                "bg-medexa-gray-900 text-white font-bold border-0"
              }>
                {claim.claimStatus.toUpperCase()}
              </Badge>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-medexa-gray-900 font-semibold rounded-full hover:bg-medexa-gray-100 hidden md:flex">
              Export <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={handleSubmitClaim}
              disabled={isSubmitting || claim.claimStatus === "submitted"}
              variant="ghost"
              className={`rounded-full font-bold h-10 px-6 text-base ${claim.claimStatus === "submitted" ? "text-medexa-green bg-medexa-green/10" : "text-medexa-blue hover:bg-medexa-blue-light"}`}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : claim.claimStatus === "submitted" ? (
                <Check className="mr-2 h-5 w-5 stroke-[2.5]" />
              ) : (
                <Send className="mr-2 h-5 w-5 stroke-[2.5]" />
              )}
              {claim.claimStatus === "submitted" ? "Submitted" : "Submit Claim"}
            </Button>
          </div>
        </div>

        {/* Patient Meta Row */}
        <div className="flex flex-wrap items-start md:items-center gap-x-12 gap-y-4 text-sm font-semibold text-medexa-gray-900 border-b border-medexa-gray-200 pb-6 ml-2 md:ml-12">
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Patient</span>
            <span className="font-bold text-base">{patientMeta.patient || "Not set"}</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">MRN Number</span>
            <span className="font-bold text-base">#{patientMeta.mrn || "N/A"}</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Ordering Provider</span>
            <span className="font-bold text-base">{patientMeta.provider || "Dr. Sarah Miller"}</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Session Meta</span>
            <span className="font-bold text-base">{patientMeta.session || "N/A"}</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Payor Source</span>
            <span className="font-bold text-base flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-[2.5px] border-medexa-blue bg-white"></span> {patientMeta.payor || "Medicare"}
            </span>
          </div>
        </div>
      </div>

      {/* Session List Items (CPT) */}
      <div className="md:ml-12">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-medexa-gray-900">Session List Items</h2>
            <span className="text-sm font-medium text-medexa-gray-500">{cptItems.length} CPT Line Items</span>
          </div>
        </div>

        <Card className="rounded-3xl border-medexa-gray-100 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-medexa-gray-100">
                  <th className="py-4 px-6 text-sm font-semibold text-medexa-gray-500">CPT Code</th>
                  <th className="py-4 px-6 text-sm font-semibold text-medexa-gray-500">Description</th>
                  <th className="py-4 px-6 text-sm font-semibold text-medexa-gray-500">Units</th>
                  <th className="py-4 px-6 text-sm font-semibold text-medexa-gray-500">Duration</th>
                  <th className="py-4 px-6 text-sm font-semibold text-medexa-gray-500">Modifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medexa-gray-100/50">
                {cptItems.map((item) => (
                  <tr key={item.id} className="hover:bg-medexa-gray-50/50">
                    <td className="py-5 px-6">
                      <Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold px-3 py-1 text-sm rounded-lg">
                        {item.code}
                      </Badge>
                    </td>
                    <td className="py-5 px-6 font-bold text-medexa-gray-900">{item.description}</td>
                    <td className="py-5 px-6 font-bold text-medexa-gray-900">{item.units} UNIT(S)</td>
                    <td className="py-5 px-6 font-bold text-medexa-gray-900">{item.duration}</td>
                    <td className="py-5 px-6">
                      {item.modifier ? (
                        <Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold uppercase tracking-wider text-[10px] px-2.5 rounded-full">
                          {item.modifier}
                        </Badge>
                      ) : (
                        <span className="font-medium text-medexa-gray-500">--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {cptItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 px-6 text-center text-sm text-medexa-gray-400">
                      No billable CPT items compiled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ICD-10 Diagnosis Codes */}
      <div className="md:ml-12 mt-4">
        <h2 className="text-xl font-semibold text-medexa-gray-900 mb-4">ICD-10 Diagnosis Codes</h2>
        <div className="flex flex-col gap-4">
          {diagnosisCodes.map((dx) => (
            <Card key={dx.id} className={`p-5 rounded-2xl shadow-sm bg-white border ${dx.type === "Primary" ? "border-medexa-blue/10" : "border-medexa-gray-100"}`}>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-medexa-gray-50 text-medexa-gray-900 border-0 font-bold px-2 py-0.5 rounded-md text-sm">{dx.code}</Badge>
                <Badge variant="outline" className={`font-semibold rounded-full px-3 ${dx.type === "Primary" ? "border-medexa-blue text-medexa-blue" : "border-medexa-gray-200 text-medexa-gray-400"}`}>
                  {dx.type}
                </Badge>
              </div>
              <p className="font-bold text-medexa-gray-900">{dx.description}</p>
            </Card>
          ))}
          {diagnosisCodes.length === 0 && (
            <div className="text-sm text-medexa-gray-400 pl-2">No diagnosis codes compiled.</div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-medexa-gray-100 flex items-center gap-2 z-50 whitespace-nowrap">
        <Button
          onClick={handleSaveDraft}
          disabled={isSaving || claim.claimStatus === "submitted"}
          variant="ghost"
          className="rounded-full px-6 h-12 font-bold text-medexa-blue hover:bg-medexa-blue-light text-sm md:text-base"
        >
          {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2 stroke-[2.5]" />}
          Save as Draft
        </Button>
        <div className="w-px h-8 bg-medexa-gray-200 mx-2"></div>
        <Button
          onClick={handleVerifyClaim}
          disabled={isVerifying || claim.claimStatus === "submitted"}
          className="rounded-full px-6 h-12 font-bold bg-medexa-blue text-white hover:bg-blue-700 text-sm md:text-base flex items-center shadow-md"
        >
          {isVerifying ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ShieldCheck className="h-5 w-5 mr-2 stroke-[2.5]" />}
          Verify Claim Document
        </Button>
      </div>
    </div>
  );
}
