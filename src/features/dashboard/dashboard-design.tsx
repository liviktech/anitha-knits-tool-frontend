import { useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import { Download, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-context';
import { currentMonthStr as todayMonthStr } from '@/lib/date-utils';
import { RawMaterialsSection, RawMaterialCard } from './card';
import { DashboardReportModal } from './dashboard-report-modal';
import { DashboardWastageReportModal } from './dashboard-wastage-report-modal';
import { useDashboardData } from './dashboard-data-hooks';
import { ProductionSummaryTab } from './production-summary-tab';
import { SampleProductionTab } from './sample-production-tab';
import { WastageTabContent } from './wastage-summary-tab';

export function DashboardDesign() {
  const { user } = useAuth();
  const companyName = user?.kind === 'company-user' ? user.company.name : 'LK Knits';

  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'production' | 'wastage' | 'sample'>('production');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const currentMonthStr = format(filterDate, 'yyyy-MM');

  const handleRefresh = () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    setTimeout(() => setIsManualRefreshing(false), 2000);
  };

  const data = useDashboardData(currentMonthStr);

  if (data.isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white animate-in fade-in-0 duration-300">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader size="xl" className="text-[#004D40]" />
          <p className="text-sm font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-white animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both">
      <style>{`
        @keyframes dashFloatA { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-18px,24px,0) scale(1.06); } }
        @keyframes dashFloatB { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(20px,-16px,0) scale(1.08); } }
        @keyframes dashFloatC { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-12px,-18px,0) scale(1.04); } }
      `}</style>

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-200/30 blur-3xl motion-safe:[animation:dashFloatA_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-yellow-200/30 blur-3xl motion-safe:[animation:dashFloatB_11s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-64 rounded-full bg-green-200/30 blur-3xl motion-safe:[animation:dashFloatC_10s_ease-in-out_infinite]" />

      <div className="relative z-10 p-1.5 md:p-1.5 flex flex-col gap-2 bg-[#F4F1E8]">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 px-2 py-1 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <h1 className="text-[22px] font-bold text-black leading-tight px-1">Welcome to {companyName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={format(filterDate, 'yyyy-MM')}
              max={todayMonthStr()}
              onChange={(e) => { if (e.target.value) setFilterDate(parseISO(`${e.target.value}-01`)); }}
              className="font-hanken h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-[10px] font-medium text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
            />
            <button
              onClick={handleRefresh}
              disabled={isManualRefreshing}
              className="flex items-center justify-center border border-gray-400 rounded-lg w-9 h-9 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin text-[#004D40]' : ''}`} />
            </button>
          </div>
        </div>

        {isManualRefreshing ? (
          <div className="flex-1 flex items-center justify-center py-32 animate-in fade-in-0 duration-300">
            <div className="flex flex-col items-center gap-3 text-[#004D40]">
              <Loader size="xl" />
              <p className="text-sm font-medium animate-pulse">Refreshing dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">

            {/* Raw Materials */}
            <RawMaterialsSection>
              <RawMaterialCard
                icon="/hdpe.png" iconAlt="HDPE" title="HDPE Materials"
                totalWeight={data.rawMaterials.weight} totalValueClassName="text-brown-400"
                hoverBorderClassName="hover:border-blue-200" items={data.rawMaterials.items}
                itemsGapClassName="gap-x-10 gap-y-3" showBags weightSuffixVariant="plain"
                emptyMessage="No HDPE this month"
              />
              <RawMaterialCard
                icon="/chemical.png" iconAlt="Chemicals" title="Chemicals"
                totalWeight={data.chemicals.weight} totalValueClassName="text-gray-800"
                hoverBorderClassName="hover:border-orange-200" items={data.chemicals.items}
                itemsGapClassName="gap-x-9 gap-y-3 mt-px" weightSuffixVariant="styled"
                emptyMessage="No chemicals this month"
              />
              <RawMaterialCard
                icon="/color.png" iconAlt="Colors" title="Colors"
                totalWeight={data.invColors.weight} totalValueClassName="text-gray-800"
                hoverBorderClassName="hover:border-purple-200" items={data.invColors.items}
                itemsGapClassName="gap-x-9 gap-y-3 mt-1" weightSuffixVariant="styled"
                emptyMessage="No colors this month"
              />
            </RawMaterialsSection>

            {/* Tabs */}
            <div className="mt-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="gap-4 cursor-pointer">
                <div className="border-b border-gray-400 px-3 flex items-center justify-between gap-2">
                  <TabsList variant="underline" className="border-b-0 gap-2">
                    {(['production', 'sample', 'wastage'] as const).map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        style={{
                          backgroundColor: activeTab === tab ? '#004D40' : 'transparent',
                          color: activeTab === tab ? 'white' : undefined,
                        }}
                        className="!rounded-t-md px-6 py-2 transition-all duration-300 data-[state=active]:after:hidden hover:text-[#004D40]"
                      >
                        <span className="flex items-center gap-1 text-[15px] font-extrabold">
                          {tab === 'production' ? 'Production Summary' : tab === 'sample' ? 'Sample Production' : 'Wastage Summary'}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    variant="outline" size="sm"
                    className="shrink-0 flex items-center gap-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40]/10 rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide"
                    onClick={() => setIsReportModalOpen(true)}
                  >
                    <Download className="w-3 h-3" /> REPORT
                  </Button>
                </div>

                <div className="overflow-hidden">
                  <TabsContent value="production" className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-right-8 duration-500 ease-out">
                    <ProductionSummaryTab
                      extruderColorRows={data.extruderColorRows} extruderGrandTotal={data.extruderGrandTotal}
                      loomsColorRows={data.loomsColorRows} loomsGrandTotal={data.loomsGrandTotal}
                      fabricColorRows={data.fabricColorRows} fabricGrandTotal={data.fabricGrandTotal}
                      yarnBalanceByColor={data.yarnBalanceByColor} yarnBalanceByVariant={data.yarnBalanceByVariant} yarnBalanceColorRows={data.yarnBalanceColorRows}
                      koraBalanceByColor={data.koraBalanceByColor} koraBalanceByVariant={data.koraBalanceByVariant} koraBalanceColorRows={data.koraBalanceColorRows}
                      fabricStockColorRows={data.fabricStockColorRows} totalFabricStockKg={data.totalFabricStockKg}
                      fabricDeliveredColorRows={data.fabricDeliveredColorRows} monthDeliveriesByColor={data.monthDeliveriesByColor} selectedMonthDeliveryTotal={data.selectedMonthDeliveryTotal}
                    />
                  </TabsContent>

                  <TabsContent value="sample" className="flex flex-col gap-2">
                    <SampleProductionTab
                      sampleExtruderColorRows={data.sampleExtruderColorRows} sampleExtruderGrandTotal={data.sampleExtruderGrandTotal}
                      sampleLoomsColorRows={data.sampleLoomsColorRows} sampleLoomsGrandTotal={data.sampleLoomsGrandTotal}
                      sampleFabricColorRows={data.sampleFabricColorRows} sampleFabricGrandTotal={data.sampleFabricGrandTotal}
                      sampleYarnBalanceByColor={data.sampleYarnBalanceByColor} sampleYarnBalanceByVariant={data.sampleYarnBalanceByVariant} sampleYarnBalanceColorRows={data.sampleYarnBalanceColorRows}
                      sampleKoraBalanceByColor={data.sampleKoraBalanceByColor} sampleKoraBalanceByVariant={data.sampleKoraBalanceByVariant} sampleKoraBalanceColorRows={data.sampleKoraBalanceColorRows}
                      sampleFabricStockColorRows={data.sampleFabricStockColorRows} sampleTotalFabricStockKg={data.sampleTotalFabricStockKg}
                      sampleFabricDeliveredColorRows={data.sampleFabricDeliveredColorRows} sampleDeliveriesByColor={data.sampleDeliveriesByColor} sampleSelectedMonthDeliveryTotal={data.sampleSelectedMonthDeliveryTotal}
                    />
                  </TabsContent>

                  <TabsContent value="wastage" className="flex flex-col gap-2 animate-in fade-in-0 slide-in-from-right-8 duration-500 ease-out">
                    <WastageTabContent
                      currentMonthStr={currentMonthStr}
                      looseWasteKg={data.looseWasteKg} lumsWasteKg={data.lumsWasteKg}
                      extruderProductionsData={data.extruderProductionsData}
                      loomsProductionsData={data.loomsProductionsData}
                      fabricCheckingData={data.fabricCheckingData}
                      sampleExtruderData={data.sampleExtruderData}
                      sampleLoomsData={data.sampleLoomsData}
                      sampleFabricData={data.sampleFabricData}
                      loomsWasteByColor={data.loomsWasteByColor}
                      fabricWasteByColor={data.fabricWasteByColor}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

          </div>
        )}
      </div>

      {/* Report modals */}
      {activeTab === 'wastage' ? (
        <DashboardWastageReportModal
          open={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          companyName={companyName}
          monthStr={currentMonthStr}
          extruderByColor={data.extruderWasteSummaryByColor}
          extruderTotal={data.lumsWasteKg + data.looseWasteKg}
          loomsByColor={data.loomsWasteByColor}
          loomsTotal={data.loomsWasteByColor.reduce((sum, r) => sum + r.loomsWaste, 0)}
          fabricByColor={data.fabricWasteByColor}
          fabricTotal={data.fabricWasteByColor.reduce((sum, r) => sum + r.fabricWaste + r.bitWaste, 0)}
          extruderBySize={data.extruderWasteBySize}
          extruderByChemical={data.extruderWasteByChemical}
          loomsBySize={data.loomsWasteBySize}
          loomsByChemical={data.loomsWasteByChemical}
          fabricBySize={data.fabricWasteBySize}
          fabricByChemical={data.fabricWasteByChemical}
        />
      ) : (
        <DashboardReportModal
          open={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          reportTitle={activeTab === 'sample' ? 'Sample Production Report' : 'Production Summary Report'}
          companyName={companyName}
          monthStr={currentMonthStr}
          extruderByColor={activeTab === 'sample' ? data.sampleExtruderColorRows : data.extruderColorRows}
          extruderTotal={activeTab === 'sample' ? data.sampleExtruderGrandTotal : data.extruderGrandTotal}
          loomsByColor={activeTab === 'sample' ? data.sampleLoomsColorRows : data.loomsColorRows}
          loomsTotal={activeTab === 'sample' ? data.sampleLoomsGrandTotal : data.loomsGrandTotal}
          fabricByColor={activeTab === 'sample' ? data.sampleFabricColorRows : data.fabricColorRows}
          fabricTotal={activeTab === 'sample' ? data.sampleFabricGrandTotal : data.fabricGrandTotal}
          extruderBySize={activeTab === 'sample' ? data.sampleExtruderBySizeRows : data.extruderBySizeRows}
          loomsBySize={activeTab === 'sample' ? data.sampleLoomsBySizeRows : data.loomsBySizeRows}
          fabricBySize={activeTab === 'sample' ? data.sampleFabricBySizeRows : data.fabricBySizeRows}
          extruderByChemical={activeTab === 'sample' ? data.sampleExtruderByChemicalRows : data.extruderByChemicalRows}
          loomsByChemical={activeTab === 'sample' ? data.sampleLoomsByChemicalRows : data.loomsByChemicalRows}
          fabricByChemical={activeTab === 'sample' ? data.sampleFabricByChemicalRows : data.fabricByChemicalRows}
          yarnBalanceByColor={activeTab === 'sample' ? data.sampleYarnBalanceByColor : data.yarnBalanceByColor}
          koraBalanceByColor={activeTab === 'sample' ? data.sampleKoraBalanceByColor : data.koraBalanceByColor}
          fabricStockByColor={activeTab === 'sample' ? data.sampleFabricStockByColor : data.fabricStockByColor}
          totalFabricStock={activeTab === 'sample' ? data.sampleTotalFabricStockKg : data.totalFabricStockKg}
          deliveriesByColor={activeTab === 'sample' ? data.sampleDeliveriesByColor : data.monthDeliveriesByColor}
          totalDelivered={activeTab === 'sample' ? data.sampleSelectedMonthDeliveryTotal : data.selectedMonthDeliveryTotal}
        />
      )}
    </div>
  );
}
