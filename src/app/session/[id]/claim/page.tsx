"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronDown, Send, Plus, Save, Edit2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ClaimDocument() {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="flex flex-col gap-8 pb-24 max-w-[1000px] mx-auto">
      
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/session/${sessionId}/documentation?tab=summary`}>
              <Button variant="ghost" size="icon" className="text-medexa-gray-900 rounded-full hover:bg-medexa-gray-100">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-medexa-gray-900">
              Claim Document
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-medexa-gray-900 font-semibold rounded-full hover:bg-medexa-gray-100 hidden md:flex">
              Export <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" className="text-medexa-blue font-bold hover:bg-medexa-blue-light rounded-full text-base">
              <Send className="mr-2 h-5 w-5 stroke-[2.5]" /> Submit Claim
            </Button>
          </div>
        </div>
        
        {/* Patient Meta Row */}
        <div className="flex flex-wrap items-start md:items-center gap-x-12 gap-y-4 text-sm font-semibold text-medexa-gray-900 border-b border-medexa-gray-200 pb-6 ml-2 md:ml-12">
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Patient</span>
            <span className="font-bold text-base">Samuel T. (58/M)</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">MRN Number</span>
            <span className="font-bold text-base">220486</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Ordering Provider</span>
            <span className="font-bold text-base">Dr. Sarah Miller</span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Session Meta</span>
            <span className="font-bold text-base">June 18, <span className="font-medium text-medexa-gray-500 text-sm">• 52 min</span></span>
          </div>
          <div>
            <span className="text-medexa-gray-500 font-medium block mb-1 text-xs">Payor Source</span>
            <span className="font-bold text-base flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-[2.5px] border-medexa-blue bg-white"></span> Medicare
            </span>
          </div>
        </div>
      </div>

      {/* Session List Items (CPT) */}
      <div className="md:ml-12">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-medexa-gray-900">Session List Items</h2>
            <span className="text-sm font-medium text-medexa-gray-500">4 Billable Units</span>
          </div>
          <Button variant="ghost" className="text-medexa-blue font-bold hover:bg-medexa-blue-light rounded-full">
            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add more CPTs
          </Button>
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
                <tr className="hover:bg-medexa-gray-50/50">
                  <td className="py-5 px-6"><Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold px-3 py-1 text-sm rounded-lg">97110</Badge></td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">Therapeutic Ex.</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">1 UNIT</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">08 : 04</td>
                  <td className="py-5 px-6 font-medium text-medexa-gray-500">--</td>
                </tr>
                <tr className="hover:bg-medexa-gray-50/50">
                  <td className="py-5 px-6"><Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold px-3 py-1 text-sm rounded-lg">97112</Badge></td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">Neuromusc. Ed.</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">1 UNIT</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">15 : 56</td>
                  <td className="py-5 px-6"><Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold uppercase tracking-wider text-[10px] px-2.5 rounded-full">MODIFIER 59</Badge></td>
                </tr>
                <tr className="hover:bg-medexa-gray-50/50">
                  <td className="py-5 px-6"><Badge variant="secondary" className="bg-medexa-gray-100 text-medexa-gray-900 hover:bg-medexa-gray-100 border-0 font-bold px-3 py-1 text-sm rounded-lg">97530</Badge></td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">Therapeutic Act.</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">2 UNITS</td>
                  <td className="py-5 px-6 font-bold text-medexa-gray-900">28 : 00</td>
                  <td className="py-5 px-6 font-medium text-medexa-gray-500">--</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ICD-10 Diagnosis Codes */}
      <div className="md:ml-12 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-medexa-gray-900">ICD-10 Diagnosis Codes</h2>
          <Button variant="ghost" className="text-medexa-blue font-bold hover:bg-medexa-blue-light rounded-full">
            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add Diagnosis
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Primary */}
          <Card className="p-5 rounded-2xl border-medexa-blue-light/50 shadow-sm bg-white border border-medexa-blue/10">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary" className="bg-medexa-gray-50 text-medexa-gray-900 border-0 font-bold px-2 py-0.5 rounded-md text-sm">E11.9</Badge>
              <Badge variant="outline" className="border-medexa-gray-300 text-medexa-gray-500 font-semibold rounded-full px-3">Primary</Badge>
            </div>
            <p className="font-bold text-medexa-gray-900">Type 2 Diabetes Mellitus without<br/>complications</p>
          </Card>

          {/* Secondary 1 */}
          <Card className="p-5 rounded-2xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary" className="bg-medexa-gray-50 text-medexa-gray-900 border-0 font-bold px-2 py-0.5 rounded-md text-sm">M54.5</Badge>
              <Badge variant="outline" className="border-medexa-gray-200 text-medexa-gray-400 font-semibold rounded-full px-3">Secondary</Badge>
            </div>
            <p className="font-bold text-medexa-gray-900">Low Back Pain</p>
          </Card>

          {/* Secondary 2 */}
          <Card className="p-5 rounded-2xl border-medexa-gray-100 shadow-sm bg-white">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary" className="bg-medexa-gray-50 text-medexa-gray-900 border-0 font-bold px-2 py-0.5 rounded-md text-sm">R53.83</Badge>
              <Badge variant="outline" className="border-medexa-gray-200 text-medexa-gray-400 font-semibold rounded-full px-3">Secondary</Badge>
            </div>
            <p className="font-bold text-medexa-gray-900">Other Fatigue (Chronic)</p>
          </Card>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-medexa-gray-100 flex items-center gap-2 z-50 whitespace-nowrap">
        <Button variant="ghost" className="rounded-full px-6 h-12 font-bold text-medexa-blue hover:bg-medexa-blue-light text-sm md:text-base">
          <Save className="h-5 w-5 mr-2 stroke-[2.5]" />
          Save as Draft
        </Button>
        <div className="w-px h-8 bg-medexa-gray-200 mx-2"></div>
        <Button variant="ghost" className="rounded-full px-6 h-12 font-bold text-medexa-blue hover:bg-medexa-blue-light text-sm md:text-base">
          <Edit2 className="h-5 w-5 mr-2 stroke-[2.5]" />
          Edit Session Data
        </Button>
        <div className="w-px h-8 bg-medexa-gray-200 mx-2"></div>
        <Button className="rounded-full px-6 h-12 font-bold bg-medexa-blue text-white hover:bg-blue-700 text-sm md:text-base flex items-center shadow-md">
          <ShieldCheck className="h-5 w-5 mr-2 stroke-[2.5]" />
          Verify Claim Document
          <div className="ml-2 h-4 w-4 rounded-full border border-white/40 flex items-center justify-center text-[10px]">i</div>
        </Button>
      </div>

    </div>
  );
}
