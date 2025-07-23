"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { User, Bell, Palette, ShieldCheck } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your intelligence feed and preferences</p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User /> Profile & Interests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
              <div className="flex items-center justify-between">
                <p>Data Scientist</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // TODO: Implement onClick to open a modal or navigate to the personalization page
                  }}
                >
                  Update Role
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Tech Interests</h3>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Computer Vision</Badge>
                  <Badge variant="secondary">LLMs</Badge>
                  <Badge variant="secondary">MLOps</Badge>
                  <Badge variant="secondary">Cloud AI</Badge>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // TODO: Implement onClick to open a modal or navigate to the personalization page
                  }}
                >
                  Manage Interests
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">High Impact Stories</h3>
                <p className="text-sm text-muted-foreground">Get notified about breakthrough developments</p>
              </div>
              <Switch
                defaultChecked
                onCheckedChange={(checked) => {
                  // TODO: Implement onCheckedChange to update user notification preferences, e.g., POST /api/settings/notifications
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Daily Digest</h3>
                <p className="text-sm text-muted-foreground">Receive a summary of top stories each morning</p>
              </div>
              <Switch
                defaultChecked
                onCheckedChange={(checked) => {
                  // TODO: Implement onCheckedChange to update user notification preferences, e.g., POST /api/settings/notifications
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Weekly Trends</h3>
                <p className="text-sm text-muted-foreground">Weekly analysis of emerging trends</p>
              </div>
              <Switch
                onCheckedChange={(checked) => {
                  // TODO: Implement onCheckedChange to update user notification preferences, e.g., POST /api/settings/notifications
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Theme</h3>
            <ToggleGroup
              type="single"
              defaultValue="light"
              variant="outline"
              onValueChange={(value) => {
                // TODO: Implement onValueChange to persist the user's theme preference
              }}
            >
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck /> Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Personalization</h3>
                <p className="text-sm text-muted-foreground">Use your role and interests to improve recommendations</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
