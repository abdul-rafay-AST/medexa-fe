"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, Edit2, Check, Send, Info, X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface SoapNoteSection {
  [key: string]: string | undefined;
  chiefComplaint?: string;
  painScale?: string;
  duration?: string;
  observationNotes?: string;
  rangeOfMotion?: string;
  affect?: string;
  vitalSigns?: string;
  diagnosisSummary?: string;
  primaryDiagnosisCode?: string;
  severity?: string;
  followUpPlan?: string;
}

interface SoapData {
  subjective: SoapNoteSection;
  objective: SoapNoteSection;
  assessment: SoapNoteSection;
  plan: SoapNoteSection;
}

interface BillingCpt {
  id: string;
  code: string;
  title: string;
  units: string;
  duration: string;
  warning?: string;
  note?: string | null;
  status: "pending" | "approved" | "rejected";
}

interface BillingData {
  sessionTime: string;
  units: string;
  threshold: string;
  cptCodes: BillingCpt[];
  snfFunctionalLogic?: {
    section: string;
    level: string;
  };
}

interface SummaryData {
  summary: string;
  sent: boolean;
}

export default function Documentation() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = params.id as string;

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "soap");
  const [soap, setSoap] = useState<SoapData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSoap, setIsEditingSoap] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    router.replace(`${pathname}?tab=${val}`);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [resSoap, resBilling, resSummary] = await Promise.all([
          api.getSoapNotes(sessionId),
          api.getBilling(sessionId),
          api.getPatientSummary(sessionId),
        ]);

        if (resSoap) setSoap(resSoap as SoapData);
        if (resBilling) setBilling(resBilling as BillingData);
        if (resSummary) setSummary(resSummary as SummaryData);
      } catch (e) {
        console.error("Failed to load session documentation data", e);
        setError("Failed to load data from backend.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  const handleSoapChange = (section: "subjective" | "objective" | "assessment" | "plan", field: string, value: string) => {
    setSoap((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  };

  const handleSaveSoap = async () => {
    try {
      setIsEditingSoap(false);
      const updated = await api.updateSoapNotes(sessionId, soap);
      if (updated) setSoap(updated as SoapData);
    } catch (e) {
      console.error("Failed to save SOAP notes", e);
    }
  };

  const handleSaveSummary = async () => {
    try {
      setIsEditingSummary(false);
      const updated = await api.updatePatientSummary(sessionId, summary?.summary || "");
      if (updated) setSummary(updated as SummaryData);
    } catch (e) {
      console.error("Failed to save summary", e);
    }
  };

  const handleSendSummary = async () => {
    try {
      setIsSendingSummary(true);
      const updated = await api.sendPatientSummary(sessionId);
      if (updated) setSummary(updated as SummaryData);
    } catch (e) {
      console.error("Failed to send summary", e);
    } finally {
      setIsSendingSummary(false);
    }
  };

  const handleApproveCpt = async (cptId: string) => {
    try {
      const updated = await api.approveBillingCpt(sessionId, cptId);
      if (updated) {
        const resBilling = await api.getBilling(sessionId);
        if (resBilling) setBilling(resBilling as BillingData);
      }
    } catch (e) {
      console.error("Failed to approve CPT", e);
    }
  };

  const handleRejectCpt = async (cptId: string) => {
    try {
      const updated = await api.rejectBillingCpt(sessionId, cptId);
      if (updated) {
        const resBilling = await api.getBilling(sessionId);
        if (resBilling) setBilling(resBilling as BillingData);
      }
    } catch (e) {
      console.error("Failed to reject CPT", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-medexa-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-medexa-blue" />
        Loading documentation...
      </div>
    );
  }

  if (error || !soap) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
        <Card className="p-8 max-w-lg rounded-3xl border-medexa-gray-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-medexa-gray-900 mb-3">Documentation Unavailable</h1>
          <p className="text-medexa-gray-500 mb-6">{error || "Ensure the backend is running and the session is finalized."}</p>
          <Link href="/">
            <Button className="rounded-full bg-medexa-blue text-white hover:bg-blue-700">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-[1000px] mx-auto">
      {/* Session Header */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-medexa-gray-900 rounded-full hover:bg-medexa-gray-100">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-medexa-gray-900 flex items-center gap-3">
            Therapeutic Therapy Session
            <span className="flex items-center gap-1.5 text-sm font-semibold text-medexa-blue tracking-wide bg-medexa-blue-light/50 px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-medexa-blue"></span>
              Medexa Summarized
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-8 pl-14 text-sm font-semibold text-medexa-gray-900">
          <span>Finalized Status: <span className="text-medexa-green font-bold uppercase">Complete</span></span>
          <span className="text-medexa-gray-500 font-medium">Session ID: <span className="text-medexa-gray-900 font-bold">#{sessionId.slice(0, 8)}</span></span>
          <span className="text-medexa-gray-500 font-medium">Duration: <span className="text-medexa-gray-900 font-bold">{billing?.sessionTime || "00:00"}</span></span>
          <span className="text-medexa-gray-500 font-medium">Unit(s): <span className="text-medexa-gray-900 font-bold">{billing?.units || "0"}</span></span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-medexa-gray-200 pb-4 mb-6 gap-4">
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            <TabsTrigger
              value="soap"
              className="rounded-full px-6 py-2.5 data-[state=active]:bg-medexa-blue-light data-[state=active]:text-medexa-blue data-[state=active]:border-medexa-blue border border-transparent text-medexa-gray-500 font-semibold"
            >
              SOAP Notes
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-full px-6 py-2.5 data-[state=active]:bg-medexa-blue-light data-[state=active]:text-medexa-blue data-[state=active]:border-medexa-blue border border-transparent text-medexa-gray-500 font-semibold"
            >
              Billing Intelligence
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="rounded-full px-6 py-2.5 data-[state=active]:bg-medexa-blue-light data-[state=active]:text-medexa-blue data-[state=active]:border-medexa-blue border border-transparent text-medexa-gray-500 font-semibold"
            >
              Patient Summary
            </TabsTrigger>
          </TabsList>

          <Link href={`/session/${sessionId}/claim?tab=${activeTab}`}>
            <Button variant="ghost" className="text-medexa-blue font-bold text-base hover:bg-medexa-blue-light rounded-full">
              <Check className="mr-2 h-5 w-5 stroke-[3]" /> Create Claim-Document
            </Button>
          </Link>
        </div>

        {/* SOAP Notes Tab */}
        <TabsContent value="soap" className="flex flex-col gap-6 mt-0 outline-none">
          {/* Controls */}
          <div className="flex justify-end gap-2">
            {isEditingSoap ? (
              <Button onClick={handleSaveSoap} className="rounded-full bg-medexa-blue text-white hover:bg-blue-700 font-semibold">
                <Save className="h-4 w-4 mr-2" /> Save SOAP Notes
              </Button>
            ) : (
              <Button onClick={() => setIsEditingSoap(true)} variant="outline" className="rounded-full border-medexa-gray-200 text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100">
                <Edit2 className="h-4 w-4 mr-2" /> Edit SOAP Notes
              </Button>
            )}
          </div>

          {/* Subjective */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">Subjective</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Chief Complaint</label>
                {isEditingSoap ? (
                  <Textarea
                    value={soap.subjective.chiefComplaint}
                    onChange={(e) => handleSoapChange("subjective", "chiefComplaint", e.target.value)}
                    className="rounded-xl border-medexa-gray-200 min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {soap.subjective.chiefComplaint || "No complaint recorded."}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Pain Scale (0-10)</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.subjective.painScale}
                      onChange={(e) => handleSoapChange("subjective", "painScale", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold">
                      {soap.subjective.painScale || "Not recorded"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Duration</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.subjective.duration}
                      onChange={(e) => handleSoapChange("subjective", "duration", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold">
                      {soap.subjective.duration || "Not recorded"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Objective */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">Objective</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Observation Notes</label>
                {isEditingSoap ? (
                  <Textarea
                    value={soap.objective.observationNotes}
                    onChange={(e) => handleSoapChange("objective", "observationNotes", e.target.value)}
                    className="rounded-xl border-medexa-gray-200 min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {soap.objective.observationNotes || "No objective notes recorded."}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Range of Motion</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.objective.rangeOfMotion}
                      onChange={(e) => handleSoapChange("objective", "rangeOfMotion", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold">
                      {soap.objective.rangeOfMotion || "Not recorded"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Affect</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.objective.affect}
                      onChange={(e) => handleSoapChange("objective", "affect", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold">
                      {soap.objective.affect || "Not recorded"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Vital Signs</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.objective.vitalSigns}
                      onChange={(e) => handleSoapChange("objective", "vitalSigns", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold">
                      {soap.objective.vitalSigns || "Not recorded"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Assessment */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">Assessment</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Diagnosis Summary</label>
                {isEditingSoap ? (
                  <Textarea
                    value={soap.assessment.diagnosisSummary}
                    onChange={(e) => handleSoapChange("assessment", "diagnosisSummary", e.target.value)}
                    className="rounded-xl border-medexa-gray-200 min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {soap.assessment.diagnosisSummary || "No diagnosis summary recorded."}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Primary Diagnosis Code</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.assessment.primaryDiagnosisCode}
                      onChange={(e) => handleSoapChange("assessment", "primaryDiagnosisCode", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold uppercase">
                      {soap.assessment.primaryDiagnosisCode || "Not recorded"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Severity</label>
                  {isEditingSoap ? (
                    <Input
                      value={soap.assessment.severity}
                      onChange={(e) => handleSoapChange("assessment", "severity", e.target.value)}
                      className="rounded-xl border-medexa-gray-200"
                    />
                  ) : (
                    <div className="p-3 rounded-xl border border-medexa-gray-200 bg-medexa-gray-50 text-medexa-gray-900 text-sm font-semibold capitalize">
                      {soap.assessment.severity || "Not recorded"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Plan */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Treatment Plan</label>
                {isEditingSoap ? (
                  <Textarea
                    value={soap.plan.followUpPlan}
                    onChange={(e) => handleSoapChange("plan", "followUpPlan", e.target.value)}
                    className="rounded-xl border-medexa-gray-200 min-h-[100px]"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {soap.plan.followUpPlan || "No treatment plan recorded."}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Billing Intelligence Tab */}
        <TabsContent value="billing" className="flex flex-col gap-8 mt-0 outline-none">
          <h2 className="text-xl font-semibold text-medexa-gray-900 mt-2">Billing Intelligence</h2>

          <div className="flex flex-wrap gap-4">
            <Card className="p-5 rounded-2xl border-medexa-gray-200 shadow-sm min-w-[240px]">
              <p className="text-sm text-medexa-gray-500 font-medium mb-1">Session Time</p>
              <h3 className="text-3xl font-bold text-medexa-gray-900 mb-3">{billing?.sessionTime || "00:00"}</h3>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-medexa-gray-500"></span>
                <span className="text-medexa-gray-500">{billing?.threshold || "8-Minute Threshold"}</span>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-medexa-blue-light bg-medexa-blue-light/10 shadow-sm min-w-[240px] relative">
              <Info className="absolute top-4 right-4 h-5 w-5 text-medexa-gray-500" />
              <p className="text-sm text-medexa-gray-500 font-medium mb-1">Session Units</p>
              <h3 className="text-3xl font-bold text-medexa-gray-900 mb-3">{billing?.units || "0"} Units</h3>
              <Badge className="bg-medexa-green/10 text-medexa-green hover:bg-medexa-green/10 rounded-sm text-xs font-bold border-0 px-2 py-0.5">8 Minute Rule</Badge>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">CPT Codes Detected</h2>
            <div className="flex flex-col gap-4">
              {billing?.cptCodes?.map((cpt) => (
                <Card key={cpt.id} className="p-5 rounded-2xl border-medexa-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center bg-white gap-4 relative">
                  <div>
                    <h3 className="font-bold text-medexa-gray-900 mb-1">{cpt.code} - {cpt.title}</h3>
                    <div className="text-sm font-medium flex gap-4 text-medexa-gray-500">
                      <span>Unit(s): <span className="text-medexa-gray-900">{cpt.units}</span></span>
                      <span>Duration: <span className="text-medexa-gray-900">{cpt.duration}</span></span>
                      <span className="capitalize">
                        Status: <span className={cpt.status === "approved" ? "text-medexa-green font-bold" : cpt.status === "rejected" ? "text-red-500 font-bold" : "text-amber-500 font-semibold"}>{cpt.status}</span>
                      </span>
                    </div>
                    {cpt.warning && (
                      <p className="text-sm text-red-500 mt-2 font-semibold flex items-center gap-1">
                        <Info className="h-4 w-4" /> {cpt.warning}
                      </p>
                    )}
                    {cpt.note && (
                      <p className="text-sm text-medexa-gray-500 mt-1">{cpt.note}</p>
                    )}
                  </div>
                  {cpt.status === "pending" ? (
                    <div className="flex gap-2 self-end md:self-center">
                      <Button onClick={() => handleRejectCpt(cpt.id)} variant="ghost" className="text-medexa-gray-500 font-bold px-4 h-9 rounded-full hover:bg-red-50 hover:text-red-500">
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                      <Button onClick={() => handleApproveCpt(cpt.id)} variant="ghost" className="text-medexa-blue font-bold px-4 h-9 rounded-full hover:bg-medexa-blue-light">
                        <Check className="mr-2 h-4 w-4 stroke-[3]" /> Approve
                      </Button>
                    </div>
                  ) : (
                    <Badge className={cpt.status === "approved" ? "bg-medexa-green/10 text-medexa-green hover:bg-medexa-green/10 font-bold border-0 px-3 py-1 text-sm rounded-lg" : "bg-red-50 text-red-500 hover:bg-red-50 font-bold border-0 px-3 py-1 text-sm rounded-lg"}>
                      {cpt.status.toUpperCase()}
                    </Badge>
                  )}
                </Card>
              ))}
              {(!billing?.cptCodes || billing.cptCodes.length === 0) && (
                <div className="text-sm text-medexa-gray-400">No CPT codes detected.</div>
              )}
            </div>
          </div>

          {billing?.snfFunctionalLogic && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-medexa-gray-900 mb-4">SNF & Functional Logic</h2>
              <p className="text-sm text-medexa-gray-900 font-medium mb-4">Section GG — Patient Assist Level (MDS 3.0)</p>
              <Card className="p-5 rounded-2xl border-medexa-gray-200 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-medexa-blue">{billing.snfFunctionalLogic.section}</h3>
                  <Badge variant="outline" className="border-medexa-blue text-medexa-blue font-semibold">{billing.snfFunctionalLogic.level}</Badge>
                </div>
                <p className="text-sm text-medexa-gray-500">Determined from clinical observations during exercises.</p>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Patient Summary Tab */}
        <TabsContent value="summary" className="mt-0 outline-none flex flex-col gap-6">
          <div className="flex justify-end gap-2">
            {isEditingSummary ? (
              <Button onClick={handleSaveSummary} className="rounded-full bg-medexa-blue text-white hover:bg-blue-700 font-semibold">
                <Save className="h-4 w-4 mr-2" /> Save Summary
              </Button>
            ) : (
              <Button onClick={() => setIsEditingSummary(true)} variant="outline" className="rounded-full border-medexa-gray-200 text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100">
                <Edit2 className="h-4 w-4 mr-2" /> Edit Summary
              </Button>
            )}
            <Button
              onClick={handleSendSummary}
              disabled={isSendingSummary || summary?.sent}
              variant="ghost"
              className={`rounded-full font-bold px-6 h-10 ${summary?.sent ? "text-medexa-green bg-medexa-green/10" : "text-medexa-blue hover:bg-medexa-blue-light"}`}
            >
              {isSendingSummary ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : summary?.sent ? (
                <Check className="h-4 w-4 mr-2 stroke-[2.5]" />
              ) : (
                <Send className="h-4 w-4 mr-2 stroke-[2]" />
              )}
              {summary?.sent ? "Sent to Patient" : "Send to Patient"}
            </Button>
          </div>

          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white flex flex-col min-h-[400px]">
            <h2 className="text-lg font-semibold text-medexa-gray-500 mb-4">Session Summary Note</h2>
            {isEditingSummary ? (
              <Textarea
                className="flex-1 resize-none border border-medexa-gray-200 rounded-xl p-4 text-medexa-gray-900 text-base leading-relaxed outline-none focus:border-medexa-blue"
                value={summary?.summary || ""}
                onChange={(e) => setSummary((prev) => {
                  if (!prev) return null;
                  return { ...prev, summary: e.target.value };
                })}
              />
            ) : (
              <div className="flex-1 text-medexa-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                {summary?.summary || "No summary text available."}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
