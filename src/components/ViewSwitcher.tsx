// src/components/ViewSwitcher.tsx

import { useGroup } from "@/contexts/GroupContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Users } from "lucide-react";

export default function ViewSwitcher() {
  const { groups, selectedGroup, setSelectedGroup, loadingGroups } = useGroup();

  if (loadingGroups) {
    return <div className="w-40 h-10 bg-muted rounded-md animate-pulse" />;
  }

  const selectedGroupName = selectedGroup
    ? groups.find(g => g.id === selectedGroup)?.nome
    : "Pessoal";

  return (
    <Select
      value={selectedGroup || 'personal'}
      onValueChange={(value) => setSelectedGroup(value === 'personal' ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue>
            <div className="flex items-center gap-2">
                {selectedGroup ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                <span className="truncate">{selectedGroupName}</span>
            </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="personal">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Pessoal
          </div>
        </SelectItem>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {group.nome}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}