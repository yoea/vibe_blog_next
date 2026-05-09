'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonateButton } from '@/components/donate-button';

export function SupportSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>支持</CardTitle>
      </CardHeader>
      <CardContent>
        <DonateButton>
          <Button
            variant="outline"
            className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
          >
            <Heart className="h-4 w-4 mr-1.5 text-red-500" />
            给网站作者充电
          </Button>
        </DonateButton>
        <p className="text-xs text-muted-foreground mt-2">
          如果这个网站对你有帮助，可以请作者喝杯咖啡
        </p>
      </CardContent>
    </Card>
  );
}
