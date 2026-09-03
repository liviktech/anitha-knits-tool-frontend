import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, Trash2, Scissors } from 'lucide-react';
import { OpeningBalanceHDPETab } from './opening-balance-hdpe';
import { OpeningBalanceWastageTab } from './opening-balance-wastage';
import { OpeningBalanceFabricTab } from './opening-balance-fabric';

type OpeningBalanceSubTab = 'hdpe' | 'wastage' | 'fabric';

export function OpeningBalanceTab() {
  const [activeTab, setActiveTab] = useState<OpeningBalanceSubTab>('hdpe');

  return (
    <div className="space-y-6">
      

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as OpeningBalanceSubTab)}
        className="w-full"
      >
        <TabsList className="bg-gray-300/50 p-1 rounded-lg inline-flex mb-4">
          <TabsTrigger value="hdpe" className="rounded-md px-4 py-2 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all group">
            <span className="flex items-center gap-2">
              <Box className="h-4 w-4 text-[#004D40] group-data-[state=active]:text-white" />
              HDPE
            </span>
          </TabsTrigger>
          <TabsTrigger value="wastage" className="rounded-md px-4 py-2 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all group">
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#004D40] group-data-[state=active]:text-white" />
              Wastage
            </span>
          </TabsTrigger>
          <TabsTrigger value="fabric" className="rounded-md px-4 py-2 data-[state=active]:!bg-[#004D40] data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all group">
            <span className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-[#004D40] group-data-[state=active]:text-white" />
              Fabric Stock
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hdpe" className="mt-0 outline-none">
          <OpeningBalanceHDPETab />
        </TabsContent>
        <TabsContent value="wastage" className="mt-0 outline-none">
          <OpeningBalanceWastageTab />
        </TabsContent>
        <TabsContent value="fabric" className="mt-0 outline-none">
          <OpeningBalanceFabricTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
