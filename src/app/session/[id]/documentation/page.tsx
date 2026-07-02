"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, Edit2, Check, Send, Plus, Info, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Documentation() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "soap");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

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
          <span>July 05, <span className="text-medexa-gray-500 font-medium">12:00 PM</span></span>
          <span className="text-medexa-gray-500 font-medium">Patient ID: <span className="text-medexa-gray-900 font-bold">#99283</span></span>
          <span className="text-medexa-gray-500 font-medium">Duration: <span className="text-medexa-gray-900 font-bold">52:22</span></span>
          <span className="text-medexa-gray-500 font-medium">Unit(s): <span className="text-medexa-gray-900 font-bold">3</span></span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
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
          
          <Link href={`/session/${sessionId}/claim`}>
            <Button variant="ghost" className="text-medexa-blue font-bold text-base hover:bg-medexa-blue-light rounded-full">
              <Check className="mr-2 h-5 w-5 stroke-[3]" /> Create Claim-Document
            </Button>
          </Link>
        </div>

        {/* SOAP Notes Tab */}
        <TabsContent value="soap" className="flex flex-col gap-6 mt-0 outline-none">
          {/* Subjective */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-medexa-gray-500">Subjective</h2>
              <Button variant="ghost" size="sm" className="text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100 rounded-full">
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Chief Complaint</label>
                <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed">
                  Patient reports persistent discomfort in the lower back over the last 14 days, particularly after prolonged sitting. Mentions difficulty with mobility and occasional sharp pains. States: 'I feel like my back is always tight and stiff.'
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Pain Scale (0-10)</label>
                  <Input defaultValue="6" className="rounded-xl border-medexa-gray-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Duration</label>
                  <Input defaultValue="14 days" className="rounded-xl border-medexa-gray-200" />
                </div>
              </div>
            </div>
          </Card>

          {/* Objective */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-medexa-gray-500">Objective</h2>
              <Button variant="ghost" size="sm" className="text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100 rounded-full">
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Observation Notes</label>
                <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed">
                  Observed limited range of motion in lumbar flexion (40°) and slight guarding behavior on palpation of L4-L5 region. Patient ambulates with mild antalgic gait. Vital signs within normal limits: BP 118/76, HR 72 bpm. Affect is mildly anxious. Arrived on time.
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Range of Motion</label>
                  <Input defaultValue="Lumbar Flexion 40°" className="rounded-xl border-medexa-gray-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Affect</label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 py-2 rounded-xl border border-medexa-gray-200 bg-white text-sm appearance-none outline-none focus:border-medexa-blue">
                      <option>Mildly Anxious</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medexa-gray-500 rotate-90" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">Vital Signs</label>
                  <Input defaultValue="BP 118/76, HR 72" className="rounded-xl border-medexa-gray-200" />
                </div>
              </div>
            </div>
          </Card>

          {/* Assessment */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-medexa-gray-500">Assessment</h2>
              <Button variant="ghost" size="sm" className="text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100 rounded-full">
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Diagnosis Summary</label>
                <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed">
                  Chronic Lower Back Pain (M54.5) secondary to postural dysfunction and muscle deconditioning. Patient demonstrates functional limitations consistent with moderate severity. Focus on stretching and strengthening exercises for lumbar support. Follow-up scheduled.
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Primary Diagnosis Code</label>
                  <Input defaultValue="M54.5" className="rounded-xl border-medexa-gray-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Severity</label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 py-2 rounded-xl border border-medexa-gray-200 bg-white text-sm appearance-none outline-none focus:border-medexa-blue">
                      <option>Moderate</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medexa-gray-500 rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Plan */}
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-medexa-gray-500">Plan</h2>
              <Button variant="ghost" size="sm" className="text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100 rounded-full">
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Treatment Plan</label>
                <div className="p-4 rounded-xl border border-medexa-gray-200 bg-white text-medexa-gray-900 text-sm leading-relaxed">
                  Continue with Orthoparatheautic Therapy protocol. Emphasize stretching and strengthening exercises targeting lumbar region and core stabilizers. HEP issued — patient to perform 3x daily. Follow-up appointment set for June 19, 2026.
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Next Session Date</label>
                  <Input defaultValue="06/19/2026" type="date" className="rounded-xl border-medexa-gray-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-medexa-gray-900 mb-2 block">* Session Frequency</label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 py-2 rounded-xl border border-medexa-gray-200 bg-white text-sm appearance-none outline-none focus:border-medexa-blue">
                      <option>Weekly</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medexa-gray-500 rotate-90" />
                  </div>
                </div>
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
              <h3 className="text-3xl font-bold text-medexa-gray-900 mb-3">52:22</h3>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-medexa-gray-500"></span>
                <span className="text-medexa-gray-500">1 Threshold</span>
                <span className="text-medexa-gray-900 ml-1">$11,091<span className="text-medexa-gray-500 font-normal">/$2,330</span></span>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-medexa-blue-light bg-medexa-blue-light/10 shadow-sm min-w-[240px] relative">
              <Info className="absolute top-4 right-4 h-5 w-5 text-medexa-gray-500" />
              <p className="text-sm text-medexa-gray-500 font-medium mb-1">Session Units</p>
              <h3 className="text-3xl font-bold text-medexa-gray-900 mb-3">4 Units</h3>
              <Badge className="bg-medexa-green/10 text-medexa-green hover:bg-medexa-green/10 rounded-sm text-xs font-bold border-0 px-2 py-0.5">8 Minute Rule</Badge>
            </Card>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-medexa-gray-500">CPT Codes Detected</h2>
              <Button variant="ghost" className="text-medexa-blue font-bold hover:bg-medexa-blue-light rounded-full px-4 h-9">
                <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add more CPTs
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <Card className="p-5 rounded-2xl border-medexa-gray-200 shadow-sm flex justify-between items-center bg-white">
                <div>
                  <h3 className="font-bold text-medexa-gray-900 mb-1">97110 - Therapeutic Ex.</h3>
                  <div className="text-sm font-medium flex gap-4 text-medexa-gray-500">
                    <span>Unit(s): <span className="text-medexa-gray-900">1</span></span>
                    <span>Duration: <span className="text-medexa-gray-900">08:04</span></span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-medexa-blue"><Edit2 className="h-5 w-5" /></Button>
              </Card>

              <Card className="p-5 rounded-2xl border-medexa-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-medexa-gray-900 mb-1">97112 - Neuromusc. Ed.</h3>
                    <div className="text-sm font-medium flex gap-4 text-medexa-gray-500">
                      <span>Unit(s): <span className="text-medexa-gray-900">1</span></span>
                      <span>Duration: <span className="text-medexa-gray-900">15:56</span></span>
                    </div>
                  </div>
                  <Badge className="bg-medexa-gray-900 hover:bg-medexa-gray-900 text-white rounded-full px-3 py-1 font-bold">Modifier 59 Required</Badge>
                </div>
                <p className="text-sm text-medexa-gray-500 mb-4 pb-4 border-b border-medexa-gray-100">Potential Bundle conflict detected with 97110. Apply modifier?</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" className="text-medexa-gray-500 font-bold px-4 h-9 rounded-full"><X className="mr-2 h-4 w-4" /> Reject</Button>
                  <Button variant="ghost" className="text-medexa-blue font-bold px-4 h-9 rounded-full hover:bg-medexa-blue-light"><Check className="mr-2 h-4 w-4 stroke-[3]" /> Approve</Button>
                </div>
              </Card>

              <Card className="p-5 rounded-2xl border-medexa-gray-200 shadow-sm flex justify-between items-center bg-white">
                <div>
                  <h3 className="font-bold text-medexa-gray-900 mb-1">97530 - Therapeutic Act.</h3>
                  <div className="text-sm font-medium flex gap-4 text-medexa-gray-500">
                    <span>Unit(s): <span className="text-medexa-gray-900">2</span></span>
                    <span>Duration: <span className="text-medexa-gray-900">28:22</span></span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-medexa-blue"><Edit2 className="h-5 w-5" /></Button>
              </Card>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-lg font-semibold text-medexa-gray-900 mb-4">SNF & Functional Logic</h2>
            <p className="text-sm text-medexa-gray-900 font-medium mb-6">Section GG — Patient Assist Level (MDS 3.0)</p>
            
            <div className="px-4 pb-8">
              <div className="mb-2 font-bold text-medexa-blue">3 - Partial</div>
              <div className="relative h-2 bg-medexa-blue-light/50 rounded-full w-full">
                <div className="absolute top-0 left-0 h-full w-1/2 bg-medexa-blue rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 bg-medexa-gray-500 rounded-full border-4 border-medexa-blue-light shadow-md"></div>
              </div>
              <div className="flex justify-between mt-3 text-xs font-bold text-medexa-gray-900 px-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Patient Summary Tab */}
        <TabsContent value="summary" className="mt-0 outline-none">
          <Card className="p-6 rounded-3xl border-medexa-gray-100 shadow-sm bg-white flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-medexa-gray-500">Session Summary Note</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-medexa-gray-900 font-semibold hover:bg-medexa-gray-100 rounded-full">
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-medexa-blue font-bold hover:bg-medexa-blue-light rounded-full">
                  <Send className="h-4 w-4 mr-2 stroke-[2]" /> Send to Patient
                </Button>
              </div>
            </div>
            
            <Textarea 
              className="flex-1 resize-none border-0 p-0 text-medexa-gray-900 text-base leading-relaxed focus-visible:ring-0"
              defaultValue="On June 18, 2026, Samuel completed session 4 of 12 with Dr. Sarah Miller, focusing on gait training and therapeutic exercises to support lower back pain, reduce fatigue, and improve strength and balance. He performed well and needed some movement assistance, which is normal at this stage of care. His knee flexibility improved by 15° compared with the baseline session. Next steps include a lipid panel follow-up with the primary care physician due in December 2026, continuing therapy sessions on Monday, Wednesday, and Friday, tracking pain daily in the pain diary, and completing home exercises including seated marches and heel raises."
            />
            
            <div className="flex justify-end mt-4 opacity-30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 3 3 21"/><polyline points="21 14 21 21 14 21"/></svg>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
