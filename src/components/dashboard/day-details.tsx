import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, ChevronDown, Eye, Info, ArrowRight, Lightbulb, Trash2, Factory, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';

interface DayDetailsProps {
  onClose: () => void;
}

export function DayDetails({ onClose }: DayDetailsProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <Button variant="outline" className="w-fit flex items-center gap-2 text-gray-600 bg-white shadow-sm font-normal" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">1 Jul 2026</h1>
            <p className="text-sm text-gray-500 mt-1">Daily Production Overview</p>
          </div>
          <Button variant="outline" className="bg-white shadow-sm flex items-center gap-2 text-[#a16207] border-[#fef08a] hover:bg-[#fef9c3]">
            <Calendar className="w-4 h-4" />
            Select Date
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-100 flex items-center p-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mr-4">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total DN+ Produced</p>
            <p className="text-2xl font-bold text-gray-900">2,119.95 <span className="text-sm font-normal text-gray-500">kg</span></p>
          </div>
        </Card>
        <Card className="shadow-sm border-gray-100 flex items-center p-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-full mr-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Waste (All)</p>
            <p className="text-2xl font-bold text-gray-900">77.40 <span className="text-sm font-normal text-gray-500">kg</span></p>
          </div>
        </Card>
        <Card className="shadow-sm border-gray-100 flex items-center p-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full mr-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Efficiency</p>
            <p className="text-2xl font-bold text-gray-900">96.68%</p>
          </div>
        </Card>
        <Card className="shadow-sm border-gray-100 flex items-center p-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full mr-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Fabric Checked</p>
            <p className="text-2xl font-bold text-gray-900">1,805.00 <span className="text-sm font-normal text-gray-500">kg</span></p>
          </div>
        </Card>
      </div>

      {/* 1. Extruder Production Section (GREEN) */}
      <div className="relative mt-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-[repeating-linear-gradient(45deg,#15803d,#15803d_10px,#22c55e_10px,#22c55e_20px)]" />
        <Card className="shadow-md border-t-0 rounded-t-xl border-green-100 bg-white">
          <CardHeader className="flex flex-row items-start justify-between pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#dcfce7] rounded-full">
                <Factory className="w-8 h-8 text-[#15803d]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-[#14532d]">1. Extruder Production</CardTitle>
                <p className="text-sm text-green-800/70">Raw material is converted into tape (DN+ / LUMPS)</p>
              </div>
            </div>
            <Button variant="outline" className="text-[#15803d] border-green-200 hover:bg-green-100 font-medium">
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-green-200 rounded-lg p-4 bg-white flex flex-col justify-center">
                <p className="text-xs font-bold text-green-600 uppercase mb-2">DN+ Produced</p>
                <p className="text-3xl font-bold text-[#14532d]">2,119.95 <span className="text-sm font-normal text-gray-500">kg</span></p>
              </div>
              
              <div className="border border-red-100 rounded-lg p-4 bg-[#fef2f2] relative">
                <p className="text-xs font-bold text-red-500 uppercase mb-2">Waste + Lumps</p>
                <p className="text-3xl font-bold text-red-600">14.40 <span className="text-sm font-normal text-gray-500">kg</span></p>
                <div className="absolute top-4 right-4 p-1.5 bg-red-100 text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-8 mt-4 pt-3 border-t border-red-200">
                  <div>
                    <p className="text-xs text-gray-500">Loose waste</p>
                    <p className="text-sm font-bold">14.40 <span className="text-xs font-normal text-gray-500">kg</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lumps</p>
                    <p className="text-sm font-bold">0.00 <span className="text-xs font-normal text-gray-500">kg</span></p>
                  </div>
                </div>
              </div>
              
              <div className="border border-green-200 rounded-lg p-4 bg-white flex items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-green-600 uppercase mb-2">Waste %</p>
                   <p className="text-3xl font-bold text-[#14532d]">0.68%</p>
                </div>
                {/* Mock SVG Donut Chart */}
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#15803d" strokeWidth="4" strokeDasharray="5 95" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-green-100 bg-white overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider py-4">Size</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider">Color</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider">Brand</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider text-center">Raw Material (kg)</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider text-center">Waste (kg)</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider text-center">Lumps (kg)</TableHead>
                    <TableHead className="text-green-700 font-bold text-xs uppercase tracking-wider text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-gray-700 py-4">180</TableCell>
                    <TableCell className="flex items-center gap-2 py-4"><div className="w-3 h-3 rounded-full border bg-white" /> White</TableCell>
                    <TableCell className="text-gray-600">Reliance</TableCell>
                    <TableCell className="text-center font-medium">123.90</TableCell>
                    <TableCell className="text-center font-bold text-red-500">3.10</TableCell>
                    <TableCell className="text-center font-medium">0.00</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:text-green-900">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50/30">
                    <TableCell className="font-medium text-gray-700 py-4">DN+180</TableCell>
                    <TableCell className="flex items-center gap-2 py-4"><div className="w-3 h-3 rounded-full bg-blue-600" /> Blue</TableCell>
                    <TableCell className="text-gray-600">Haldia / TATA</TableCell>
                    <TableCell className="text-center font-medium">2,081.10</TableCell>
                    <TableCell className="text-center font-bold text-red-500">11.30</TableCell>
                    <TableCell className="text-center font-medium">0.00</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:text-green-900">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center items-center text-xs text-green-800 gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5" /> All weights are in Kilograms (kg)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Looms Production Section (BLUE) */}
      <div className="relative mt-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-[repeating-linear-gradient(45deg,#1e3a8a,#1e3a8a_10px,#3b82f6_10px,#3b82f6_20px)]" />
        <Card className="shadow-md border-t-0 rounded-t-xl border-blue-100 bg-white">
          <CardHeader className="flex flex-row items-start justify-between pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#dbeafe] rounded-full">
                <Factory className="w-8 h-8 text-[#1e40af]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-[#1e3a8a]">2. Looms Production</CardTitle>
                <p className="text-sm text-blue-800/70">Tapes are woven into fabric on looms</p>
              </div>
            </div>
            <Button variant="outline" className="text-[#1e40af] border-blue-200 hover:bg-blue-100 bg-white font-medium">
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-blue-200 rounded-lg p-4 bg-white flex flex-col justify-center">
                <p className="text-xs font-bold text-blue-600 uppercase mb-2">Fabric Produced</p>
                <p className="text-3xl font-bold text-[#1e3a8a]">2,205.00 <span className="text-sm font-normal opacity-70">kg</span></p>
              </div>
              
              <div className="border border-red-200 rounded-lg p-4 bg-white relative">
                <p className="text-xs font-bold text-red-500 uppercase mb-2">Looms Waste</p>
                <p className="text-3xl font-bold text-red-600">18.60 <span className="text-sm font-normal text-gray-500">kg</span></p>
                <div className="absolute top-4 right-4 p-1.5 bg-red-100 text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              
              <div className="border border-blue-200 rounded-lg p-4 bg-white flex flex-col justify-center gap-2">
                 <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">White</span>
                    <span className="text-sm font-bold">1.00 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
                 <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-gray-600">Blue</span>
                    <span className="text-sm font-bold">17.60 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-white flex items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-blue-600 uppercase mb-2">Waste %</p>
                   <p className="text-3xl font-bold text-[#1e3a8a]">0.84%</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#2563eb" strokeWidth="4" strokeDasharray="12 88" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-blue-200/50 overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider py-4">Size</TableHead>
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider">Color</TableHead>
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider text-center">Input Weight (kg)</TableHead>
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider text-center">Waste (kg)</TableHead>
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider text-center">Final Weight (kg)</TableHead>
                    <TableHead className="text-blue-700 font-bold text-xs uppercase tracking-wider text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-gray-800 py-4">180</TableCell>
                    <TableCell className="flex items-center gap-2 py-4"><div className="w-3 h-3 rounded-full border bg-white" /> White</TableCell>
                    <TableCell className="text-center font-medium">123.90</TableCell>
                    <TableCell className="text-center font-bold text-red-500">1.00</TableCell>
                    <TableCell className="text-center font-medium">110.00</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50/30">
                    <TableCell className="font-medium text-gray-800 py-4">DN+180</TableCell>
                    <TableCell className="flex items-center gap-2 py-4"><div className="w-3 h-3 rounded-full bg-blue-600" /> Blue</TableCell>
                    <TableCell className="text-center font-medium">2,081.10</TableCell>
                    <TableCell className="text-center font-bold text-red-500">17.60</TableCell>
                    <TableCell className="text-center font-medium">1,970.00</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center items-center text-xs text-blue-800 gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5" /> All weights are in Kilograms (kg)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Fabric Checking Section (PURPLE) */}
      <div className="relative mt-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-[repeating-linear-gradient(45deg,#581c87,#581c87_10px,#a855f7_10px,#a855f7_20px)]" />
        <Card className="shadow-md border-t-0 rounded-t-xl border-purple-100 bg-white">
          <CardHeader className="flex flex-row items-start justify-between pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#f3e8ff] rounded-full">
                <CheckCircle2 className="w-8 h-8 text-[#7e22ce]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-[#4c1d95]">3. Fabric Checking</CardTitle>
                <p className="text-sm text-purple-800/70">Final fabric is checked and wastage is recorded</p>
              </div>
            </div>
            <Button variant="outline" className="text-[#7e22ce] border-purple-200 hover:bg-purple-100 bg-white font-medium">
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-purple-200 rounded-lg p-4 bg-white flex flex-col justify-center">
                <p className="text-xs font-bold text-purple-600 uppercase mb-2">Fabric Checked</p>
                <p className="text-3xl font-bold text-[#4c1d95]">1,805.00 <span className="text-sm font-normal opacity-70">kg</span></p>
              </div>
              
              <div className="border border-red-200 rounded-lg p-4 bg-[#fef2f2] relative">
                <p className="text-xs font-bold text-red-500 uppercase mb-2">Fabric Waste</p>
                <p className="text-3xl font-bold text-red-600">44.30 <span className="text-sm font-normal text-gray-500">kg</span></p>
                <div className="absolute top-4 right-4 p-1.5 bg-red-100 text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              
              <div className="border border-purple-200 rounded-lg p-3 bg-white grid grid-cols-2 gap-x-4 gap-y-2">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">FW White180</span>
                    <span className="text-sm font-bold">37.90 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">White</span>
                    <span className="text-sm font-bold">6.40 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">FW Blue180</span>
                    <span className="text-sm font-bold">0.00 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">Blue</span>
                    <span className="text-sm font-bold">0.00 <span className="font-normal text-gray-400">kg</span></span>
                 </div>
              </div>

              <div className="border border-purple-200 rounded-lg p-4 bg-white flex items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-purple-600 uppercase mb-2">Waste %</p>
                   <p className="text-3xl font-bold text-[#4c1d95]">2.46%</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#9333ea" strokeWidth="4" strokeDasharray="35 65" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-purple-200/50 overflow-x-auto bg-white rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider py-4">Size</TableHead>
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider">Color</TableHead>
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider text-center">Checked Weight (kg)</TableHead>
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider text-center">Wastage (kg)</TableHead>
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider text-center">Final Weight (kg)</TableHead>
                    <TableHead className="text-purple-700 font-bold text-xs uppercase tracking-wider text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-gray-800 py-4">180</TableCell>
                    <TableCell className="flex items-center gap-2 py-4"><div className="w-3 h-3 rounded-full border bg-white" /> White</TableCell>
                    <TableCell className="text-center font-medium">1,805.00</TableCell>
                    <TableCell className="text-center font-bold text-red-500">6.40</TableCell>
                    <TableCell className="text-center font-medium">1,760.00</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-100">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center items-center text-xs text-purple-800 gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5" /> All weights are in Kilograms (kg)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-4 flex items-start gap-3 mt-4 text-[#854d0e]">
        <Lightbulb className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          <span className="font-bold">Note:</span> Output and wastage details can be added/updated at the end of the day after production is completed.
        </p>
      </div>
    </div>
  );
}
