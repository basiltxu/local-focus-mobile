
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSound } from '@/hooks/use-sound';
import { useToast } from '@/hooks/use-toast';

export function SoundPreferences() {
  const { prefs, setPrefs, play } = useSound();
  const { toast } = useToast();

  const handleToggle = (key: 'message' | 'announcement' | 'typing', value: boolean) => {
    setPrefs({ ...prefs, [key]: value });
    if (value) {
        toast({ title: `🔔 ${key.charAt(0).toUpperCase() + key.slice(1)} sounds enabled` });
    } else {
        toast({ title: `🔕 ${key.charAt(0).toUpperCase() + key.slice(1)} sounds disabled` });
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setPrefs({ ...prefs, volume: newVolume[0] });
  };
  
  const handleVolumeCommit = () => {
    play('message'); // Play a test sound on commit
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sound Preferences</CardTitle>
        <CardDescription>Manage audio notifications for the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h4 className="font-medium">New Message Ping</h4>
            <p className="text-sm text-muted-foreground">Play a sound for new incoming messages.</p>
          </div>
          <Switch
            checked={prefs.message}
            onCheckedChange={(checked) => handleToggle('message', checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h4 className="font-medium">Announcement Chime</h4>
            <p className="text-sm text-muted-foreground">Play a sound for new system announcements.</p>
          </div>
           <Switch
            checked={prefs.announcement}
            onCheckedChange={(checked) => handleToggle('announcement', checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h4 className="font-medium">Typing Tick</h4>
            <p className="text-sm text-muted-foreground">Play a soft sound when someone starts typing.</p>
          </div>
           <Switch
            checked={prefs.typing}
            onCheckedChange={(checked) => handleToggle('typing', checked)}
          />
        </div>
         <div className="space-y-3 rounded-lg border p-4">
            <Label>Master Volume</Label>
            <Slider
                defaultValue={[prefs.volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                onValueCommit={handleVolumeCommit}
            />
             <p className="text-xs text-muted-foreground text-center">
                {(prefs.volume * 100).toFixed(0)}%
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
