
import React from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsTabsListProps {
  t: any;
}

const SettingsTabsList: React.FC<SettingsTabsListProps> = ({ t }) => {
  return (
    <TabsList className="mb-6">
      <TabsTrigger value="store">{t.tabs.store}</TabsTrigger>
      <TabsTrigger value="logo">Logo</TabsTrigger>
      <TabsTrigger value="localization">{t.tabs.localization}</TabsTrigger>
      <TabsTrigger value="sales">{t.tabs.sales}</TabsTrigger>
      <TabsTrigger value="security">{t.tabs.security}</TabsTrigger>
      <TabsTrigger value="master-password">Master Password</TabsTrigger>
      <TabsTrigger value="receipt">{t.tabs.receipt}</TabsTrigger>
      <TabsTrigger value="backup">{t.tabs.backup}</TabsTrigger>
      <TabsTrigger value="admin">{t.tabs.admin}</TabsTrigger>
    </TabsList>
  );
};

export default SettingsTabsList;
