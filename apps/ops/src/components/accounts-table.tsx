"use client";

import { Badge, EmptyState } from "@grocery/ui";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "default",
  stock_keeper: "secondary",
  rider: "outline",
  customer: "secondary",
};

interface User {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserTable({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-card)">
        <EmptyState icon={<Users className="h-6 w-6" />} title="No users in this group" />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-card)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-(--color-sidebar-item-active) text-(--color-sidebar-item-active-text) text-xs font-semibold">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{u.full_name ?? "(no name)"}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-(--color-muted-foreground)">
                {u.phone ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANT[u.role] ?? "secondary"} className="capitalize">
                  {u.role.replace("_", " ")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AccountsTable({ users }: { users: User[] }) {
  const admins = users.filter((u) => u.role === "admin");
  const riders = users.filter((u) => u.role === "rider");
  const customers = users.filter((u) => u.role === "customer");

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-4">
        <TabsTrigger value="all">All ({users.length})</TabsTrigger>
        <TabsTrigger value="admin">Admins ({admins.length})</TabsTrigger>
        <TabsTrigger value="rider">Riders ({riders.length})</TabsTrigger>
        <TabsTrigger value="customer">Customers ({customers.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <UserTable users={users} />
      </TabsContent>
      <TabsContent value="admin">
        <UserTable users={admins} />
      </TabsContent>
      <TabsContent value="rider">
        <UserTable users={riders} />
      </TabsContent>
      <TabsContent value="customer">
        <UserTable users={customers} />
      </TabsContent>
    </Tabs>
  );
}
