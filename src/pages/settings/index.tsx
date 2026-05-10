import { useTranslation } from "react-i18next";
import { User, Shield, Eye, Palette } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfileSection from "./profile-section";
import SecuritySection from "./security-section";
import ViewersSection from "./viewers-section";
import AppearanceSection from "./appearance-section";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl p-6">
      <Tabs defaultValue="profile">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="profile">
            <User className="size-4" />
            {t("userSettings.tabs.profile")}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" />
            {t("userSettings.tabs.appearance")}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="size-4" />
            {t("userSettings.tabs.security")}
          </TabsTrigger>
          <TabsTrigger value="viewers">
            <Eye className="size-4" />
            {t("userSettings.tabs.viewers")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileSection />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSection />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySection />
        </TabsContent>
        <TabsContent value="viewers">
          <ViewersSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
