import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Calendar, ListTodo, ChevronLeft, ChevronRight } from 'lucide-react';

interface FabricEntryProps {
  onClose: () => void;
}

export function FabricEntry({ onClose }: FabricEntryProps) {
  const mockData = [
    { id: 1, time: '08:15 AM', size: '160', color: 'White', colorHex: 'bg-white border-gray-300', rec: '24.5', waste: '1.2', bit: '0.3', final: '23.0' },
    { id: 2, time: '08:42 AM', size: '160', color: 'White', colorHex: 'bg-white border-gray-300', rec: '25.0', waste: '0.8', bit: '0.2', final: '24.0' },
    { id: 3, time: '09:10 AM', size: '180', color: 'Navy Blue', colorHex: 'bg-[#1e3a8a] border-[#1e3a8a]', rec: '22.8', waste: '1.5', bit: '0.5', final: '20.8' },
  ];

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Header and Form Card */}
      <Card className="shadow-sm border-purple-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-purple-900">Add Fabric Entry</CardTitle>
          <p className="text-sm text-purple-800/70">Checked in 5-metre rolls; damage is cut and re-measured.</p>
        </CardHeader>
        
        <CardContent className="pt-2">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-1 flex-1 min-w-[150px]">
              <label className="text-xs font-semibold text-gray-600">Date</label>
              <div className="relative">
                <Input type="text" defaultValue="10/25/2023" className="pl-3 pr-8" />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              </div>
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-600">Size</label>
              <Select defaultValue="160">
                <SelectTrigger>
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="160">160</SelectItem>
                  <SelectItem value="180">180</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-600">Color</label>
              <Select defaultValue="white">
                <SelectTrigger>
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="navy">Navy Blue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-gray-600">Fabric weight received (kg)</label>
              <Input type="text" placeholder="e.g. 23" />
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-600">Wastage (kg)</label>
              <Input type="text" placeholder="e.g. 1" />
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-600">Bit wastage (kg)</label>
              <Input type="text" placeholder="e.g. 0.5" />
            </div>

            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-gray-600">Final rolled weight, per 5 m (kg)</label>
              <Input type="text" placeholder="e.g. 21.5" />
            </div>
            
            <div className="flex-1 min-w-[150px] flex justify-end pb-0.5">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-medium w-full">
                + Add Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Card */}
      <Card className="shadow-sm border-purple-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md">
              <ListTodo className="w-5 h-5" />
            </div>
            Today's Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-purple-50/50">
                <TableRow>
                  <TableHead className="w-[60px] text-purple-700 font-bold uppercase text-xs tracking-wider px-6">#</TableHead>
                  <TableHead className="text-purple-700 font-bold uppercase text-xs tracking-wider">Time</TableHead>
                  <TableHead className="text-purple-700 font-bold uppercase text-xs tracking-wider">Size</TableHead>
                  <TableHead className="text-purple-700 font-bold uppercase text-xs tracking-wider">Color</TableHead>
                  <TableHead className="text-center text-purple-700 font-bold uppercase text-xs tracking-wider">Rec. (kg)</TableHead>
                  <TableHead className="text-center text-purple-700 font-bold uppercase text-xs tracking-wider">Waste (kg)</TableHead>
                  <TableHead className="text-center text-purple-700 font-bold uppercase text-xs tracking-wider">Bit (kg)</TableHead>
                  <TableHead className="text-center text-purple-700 font-bold uppercase text-xs tracking-wider">Final (kg)</TableHead>
                  <TableHead className="text-center text-purple-700 font-bold uppercase text-xs tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-400 px-6">{row.id}</TableCell>
                    <TableCell className="text-[#334155] font-medium">{row.time}</TableCell>
                    <TableCell className="text-[#334155] font-medium">{row.size}</TableCell>
                    <TableCell className="text-[#334155] font-medium flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border ${row.colorHex}`} />
                      {row.color}
                    </TableCell>
                    <TableCell className="text-center font-medium text-[#475569]">{row.rec}</TableCell>
                    <TableCell className="text-center font-medium text-red-500">{row.waste}</TableCell>
                    <TableCell className="text-center font-medium text-red-500">{row.bit}</TableCell>
                    <TableCell className="text-center font-bold text-green-500">{row.final}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 bg-purple-50 hover:bg-purple-100">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between p-6 text-sm text-gray-500 border-t bg-[#f8fafc]">
            <div>Showing 3 of 3 entries today</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end pt-4">
         <Button variant="outline" className="px-8" onClick={onClose}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
