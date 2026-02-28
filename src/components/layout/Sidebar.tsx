"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Cpu,
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
  Key,
  LayoutGrid,
  CreditCard,
  Building
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MenuItem = {
  name: string;
  href?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  defaultOpen?: boolean;
};

const navigation: MenuItem[] = [
  {
    name: 'Workspace',
    children: [
      { name: 'Explore', href: '/explore', icon: <Home size={18} /> },
      {
        name: 'Inference',
        icon: <Cpu size={18} />,
        defaultOpen: true,
        children: [
          { name: 'Model endpoints', href: '/inference/endpoints' },
          { name: 'Playground', href: '/inference/playground' },
          { name: 'Prompt presets', href: '/inference/presets' },
          { name: 'Observability', href: '/inference/observability' },
          { name: 'Inferonomics', href: '/inferonomics' },
        ]
      },
      { name: 'Post-training', href: '/post-training', icon: <LayoutGrid size={18} /> },
      {
        name: 'Data Lab',
        icon: <Database size={18} />,
        children: [
          { name: 'Datasets', href: '/data-lab/datasets' }
        ]
      },
      { name: 'API keys', href: '/api-keys', icon: <Key size={18} /> },
    ]
  },
  {
    name: 'Settings',
    children: [
      {
        name: 'Organization settings',
        icon: <Building size={18} />,
        children: [
          { name: 'General', href: '/settings/org/general' }
        ]
      },
      {
        name: 'Billing settings',
        icon: <CreditCard size={18} />,
        children: [
          { name: 'Overview', href: '/settings/billing' }
        ]
      },
      {
        name: 'Project settings',
        icon: <Settings size={18} />,
        children: [
          { name: 'General', href: '/settings/project/general' }
        ]
      },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-[#0D1117] border-r border-[#1F2937] flex flex-col h-[calc(100vh-56px)] overflow-y-auto sticky top-14 left-0">
      <nav className="flex-1 py-4 px-3 space-y-6">
        {navigation.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 mb-2">
              {group.name}
            </h3>

            {group.children?.map((item, itemIdx) => (
              <NavNode key={itemIdx} item={item} pathname={pathname} level={0} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavNode({ item, pathname, level }: { item: MenuItem; pathname: string; level: number }) {
  const [isOpen, setIsOpen] = useState(item.defaultOpen ?? false);
  const hasChildren = item.children && item.children.length > 0;

  // To handle the exact styling from the image, we only color the background and the icon differently based on active state.
  const isLeafActive = item.href ? pathname === item.href : false;

  // If it's a leaf node
  if (!hasChildren && item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group",
          isLeafActive
            ? "bg-[#1F2937] text-gray-200"
            : "text-gray-400 hover:text-gray-300 hover:bg-[#1F2937]/50",
          level > 0 && "pl-9" // Indent children
        )}
      >
        {item.icon && <span className="text-gray-400 group-hover:text-gray-300">{item.icon}</span>}
        {level > 0 && isLeafActive && <div className="absolute left-4 w-1.5 h-1.5 rounded-full bg-[#E0FF4F]"></div>}
        <span className="truncate">{item.name}</span>
      </Link>
    );
  }

  // If it's a category with children
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors group",
          "text-gray-400 hover:text-gray-300 hover:bg-[#1F2937]/50"
        )}
      >
        <div className="flex items-center gap-3">
          {item.icon && <span className="text-gray-400 group-hover:text-gray-300">{item.icon}</span>}
          <span>{item.name}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </button>

      {isOpen && (
        <div className="space-y-1 mt-1">
          {item.children!.map((child, idx) => (
            <NavNode key={idx} item={child} pathname={pathname} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
