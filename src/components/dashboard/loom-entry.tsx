import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Calendar } from 'lucide-react';

interface LoomEntryProps {
  onClose: () => void;
}

export function LoomEntry({ onClose }: LoomEntryProps) {
  const mockData = [
    { id: 1, time: '08:15 AM', date: '30 Jul 2026', size: '180', color: 'White', input: '25.5', waste: '1.2', final: '24.3' },
    { id: 2, time: '09:42 AM', date: '30 Jul 2026', size: '160', color: 'Blue', input: '22.0', waste: '0.8', final: '21.2' },
    { id: 3, time: '11:05 AM', date: '30 Jul 2026', size: '180', color: 'White', input: '26.1', waste: '1.5', final: '24.6' },
  ];

  return (
    <Card className="shadow-sm border-blue-100 mx-auto w-full max-w-5xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-blue-900">Loom Entry - 30 Jul 2026</CardTitle>
        <p className="text-sm text-blue-800/70">Uses today's extruder output as input.</p>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 flex-1 min-w-[150px]">
              <label className="text-xs font-semibold text-gray-500">Date</label>
              <div className="relative">
                <Input type="text" defaultValue="07/30/2026" className="pl-3 pr-8 bg-white" />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              </div>
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">Size</label>
              <Select defaultValue="180">
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="160">160</SelectItem>
                  <SelectItem value="180">180</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">Color</label>
              <Select defaultValue="white">
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">Input weight (kg)</label>
              <Input type="text" placeholder="e.g. 25" className="bg-white" />
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">Waste weight (kg)</label>
              <Input type="text" placeholder="e.g. 2" className="bg-white" />
            </div>
            
            <div className="space-y-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">Final weight (kg)</label>
              <Input type="text" placeholder="e.g. 23" className="bg-white" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
              + Add Entry
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-blue-900 text-lg">
            Today's Entries
          </h3>
          <div className="border border-blue-100 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-50/50">
                <TableRow>
                  <TableHead className="w-[50px] text-blue-700 font-bold">#</TableHead>
                  <TableHead className="text-blue-700 font-bold">Time</TableHead>
                  <TableHead className="text-blue-700 font-bold">Date</TableHead>
                  <TableHead className="text-blue-700 font-bold">Size</TableHead>
                  <TableHead className="text-blue-700 font-bold">Color</TableHead>
                  <TableHead className="text-center text-blue-700 font-bold">Input Weight (kg)</TableHead>
                  <TableHead className="text-center text-blue-700 font-bold">Waste Weight (kg)</TableHead>
                  <TableHead className="text-center text-blue-700 font-bold">Final Fabric (kg)</TableHead>
                  <TableHead className="text-right text-blue-700 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-500">{row.id}</TableCell>
                    <TableCell className="text-[#334155]">{row.time}</TableCell>
                    <TableCell className="text-[#334155]">{row.date}</TableCell>
                    <TableCell className="text-[#334155]">{row.size}</TableCell>
                    <TableCell className="text-[#334155]">{row.color}</TableCell>
                    <TableCell className="text-center font-medium text-[#475569]">{row.input}</TableCell>
                    <TableCell className="text-center font-medium text-red-500">{row.waste}</TableCell>
                    <TableCell className="text-center font-medium text-green-600">{row.final}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100">
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
        </div>
        
        <div className="mt-6 pt-4 flex justify-end">
          <Button variant="outline" className="px-8" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}
