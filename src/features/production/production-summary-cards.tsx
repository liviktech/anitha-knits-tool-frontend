import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProductionSummaryCards({ apiSummary }: { apiSummary: any }) {
  const extruderSummary = {
    input: apiSummary?.extruder.inputKg ?? 0,
    output: apiSummary?.extruder.outputKg ?? 0,
    wastage: apiSummary?.extruder.wastageKg ?? 0,
  };
  const efficiency = apiSummary?.extruder.efficiencyPct ?? 0;
  const wastePct = apiSummary?.extruder.wastePct ?? 0;

  const loomsSummary = {
    input: apiSummary?.looms.inputKg ?? 0,
    output: apiSummary?.looms.outputKg ?? 0,
    wastage: apiSummary?.looms.wastageKg ?? 0,
  };
  const loomsEfficiency = apiSummary?.looms.efficiencyPct ?? 0;
  const loomsWastePct = apiSummary?.looms.wastePct ?? 0;

  const fabricSummary = {
    input: apiSummary?.fabricChecking.inputKg ?? 0,
    checked: apiSummary?.fabricChecking.outputKg ?? 0,
    wastage: apiSummary?.fabricChecking.wastageKg ?? 0,
  };
  const fabricEfficiency = apiSummary?.fabricChecking.efficiencyPct ?? 0;
  const fabricWastePct = apiSummary?.fabricChecking.wastePct ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {/* Extruder Production */}
      <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
        <div className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[10px] h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
            <CardTitle className="text-[19px] font-extrabold text-[#0B5566] flex items-center gap-3">
              <div className="bg-[#0B5566] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">1</div>
              Extruder Production
            </CardTitle>
            <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <img src={extruderIcon} alt="Extruder" className="w-[35px] h-[35px] object-contain opacity-90" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
            <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{formatNum(extruderSummary.output)}</p>
              </div>
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{formatNum(extruderSummary.wastage)}</p>
              </div>
              <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{efficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="flex items-center px-1">
              <div className="flex-1">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{wastePct.toFixed(2)}%</p>
              </div>
              <div className="flex-[1.7]">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">LUMPS WASTAGE (KG)</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">0.00</p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Looms Production */}
      <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
        <div className="bg-[#7A6A00]/5 border border-[#D9D09B] rounded-[10px] h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
            <CardTitle className="text-[19px] font-extrabold text-[#7A6A00] flex items-center gap-3">
              <div className="bg-[#7A6A00] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">2</div>
              Looms Production
            </CardTitle>
            <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#7A6A00]">
              <img src={loomsIcon} alt="Looms" className="w-[35px] h-[35px] object-contain opacity-90" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
            <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{formatNum(loomsSummary.output)}</p>
              </div>
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{formatNum(loomsSummary.wastage)}</p>
              </div>
              <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{loomsEfficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="flex items-center px-1">
              <div className="flex-1">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{loomsWastePct.toFixed(2)}%</p>
              </div>
              <div className="flex-[1.7]">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">100 WASTAGE (KG)</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">0.00</p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Fabric Production */}
      <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
        <div className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[10px] h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
            <CardTitle className="text-[19px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
              <div className="bg-[#2F6B2F] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">3</div>
              Fabric Production
            </CardTitle>
            <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#004D40] flex items-center justify-center">
              <Layers className="w-[35px] h-[35px] opacity-90" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
            <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{formatNum(fabricSummary.checked)}</p>
              </div>
              <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{formatNum(fabricSummary.wastage)}</p>
              </div>
              <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{fabricEfficiency.toFixed(2)}%</p>
              </div>
            </div>
            <div className="flex items-center px-1">
              <div className="flex-1">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{fabricWastePct.toFixed(2)}%</p>
              </div>
              <div className="flex-[1.7]">
                <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTAGE VALUE (KG)</p>
                <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">0.00</p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
