import { useFeaturedContent, useCreateFeaturedContent, useDeleteFeaturedContent } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';

export default function FeaturedContent() {
  const { data: content, isLoading } = useFeaturedContent();
  const createContent = useCreateFeaturedContent();
  const deleteContent = useDeleteFeaturedContent();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Featured Content</h1><p className="text-muted-foreground">Manage homepage banners and featured items</p></div>
        <Button onClick={() => createContent.mutate({ content_type: 'banner', title: 'New Banner', is_active: false })}><Plus className="mr-2 h-4 w-4" />Add Banner</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Content Items</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : content?.length === 0 ? <p className="text-muted-foreground">No featured content</p> : (
            <div className="space-y-4">
              {content?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.title || 'Untitled'}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{item.content_type}</Badge>
                      <Badge className={item.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteContent.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
