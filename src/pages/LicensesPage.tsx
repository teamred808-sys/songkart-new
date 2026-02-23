import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEOHead } from '@/components/seo/PageSEOHead';
import { FAQSchema, ProductSchema } from '@/components/seo/SchemaOrg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  Youtube, 
  Film, 
  Podcast, 
  ShoppingBag,
  Music,
  Users,
  Shield,
  Download
} from 'lucide-react';
import { SEOBreadcrumbs } from '@/components/seo/InternalLinks';

interface LicenseInfo {
  name: string;
  description: string;
  metaDescription: string;
  price: string;
  features: { text: string; included: boolean }[];
  useCases: { icon: React.ReactNode; title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}

const licenseData: Record<string, LicenseInfo> = {
  commercial: {
    name: 'Commercial License',
    description: 'For businesses, content creators, and anyone monetizing their content. Full commercial rights included.',
    metaDescription: 'License music for commercial use on SongKart. Get copyright-safe tracks for YouTube monetization, ads, films, podcasts, and business content.',
    price: 'Starting from ₹499',
    features: [
      { text: 'Monetized YouTube videos', included: true },
      { text: 'Commercial advertising', included: true },
      { text: 'Podcasts with sponsors', included: true },
      { text: 'Films and documentaries', included: true },
      { text: 'Business presentations', included: true },
      { text: 'Unlimited project use', included: true },
      { text: 'Exclusive ownership', included: false },
      { text: 'Resale or redistribution rights', included: false },
    ],
    useCases: [
      { icon: <Youtube className="h-6 w-6" />, title: 'Monetized YouTube', description: 'Ad revenue enabled videos' },
      { icon: <ShoppingBag className="h-6 w-6" />, title: 'Advertising', description: 'TV, online, and social media ads' },
      { icon: <Film className="h-6 w-6" />, title: 'Film & Video', description: 'Documentaries, short films, corporate videos' },
      { icon: <Podcast className="h-6 w-6" />, title: 'Podcasts', description: 'Sponsored podcasts and intros' },
    ],
    faqs: [
      { question: 'Can other creators also license this song?', answer: 'Yes, Commercial Licenses are non-exclusive. Multiple creators can license the same track.' },
      { question: 'Is there a limit to how many times I can use the song?', answer: 'No, once licensed you can use the track in unlimited projects covered by the license terms.' },
      { question: 'Do I need to credit the artist?', answer: 'Check the specific license terms, but most Commercial Licenses include optional credit.' },
    ],
  },
  exclusive: {
    name: 'Exclusive License',
    description: 'Get complete ownership and exclusive rights. The song is removed from the marketplace after purchase.',
    metaDescription: 'Get exclusive music rights on SongKart. Purchase full ownership of original tracks - song is removed from marketplace after your purchase.',
    price: 'Premium pricing',
    features: [
      { text: 'Full exclusive ownership rights', included: true },
      { text: 'Song removed from marketplace', included: true },
      { text: 'All commercial uses included', included: true },
      { text: 'Unlimited worldwide use', included: true },
      { text: 'Modification rights included', included: true },
      { text: 'Perpetual license', included: true },
      { text: 'Resale rights', included: false },
      { text: 'Copyright transfer', included: false },
    ],
    useCases: [
      { icon: <Shield className="h-6 w-6" />, title: 'Brand Identity', description: 'Unique sound for your brand' },
      { icon: <Film className="h-6 w-6" />, title: 'Film Scores', description: 'Exclusive soundtrack for productions' },
      { icon: <Music className="h-6 w-6" />, title: 'Artist Releases', description: 'Release as your own (with proper credits)' },
    ],
    faqs: [
      { question: 'What happens to existing licenses after I buy exclusive?', answer: 'Existing non-exclusive licenses remain valid, but no new licenses will be sold after your exclusive purchase.' },
      { question: 'Do I own the copyright?', answer: 'You receive exclusive usage rights, but the original creator retains the underlying copyright unless specifically transferred.' },
      { question: 'Can I modify the song?', answer: 'Yes, Exclusive Licenses typically include modification rights. Check specific terms for details.' },
    ],
  },
};

export default function LicensesPage() {
  const { type } = useParams<{ type: string }>();
  
  // If no type specified, show overview page
  if (!type) {
    return <LicensesOverview />;
  }

  const license = licenseData[type];
  
  if (!license) {
    return (
      <MainLayout>
        <div className="container mx-auto py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">License Type Not Found</h1>
          <p className="text-muted-foreground mb-6">The license type you're looking for doesn't exist.</p>
          <Link to="/licenses">
            <Button>View All License Types</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Licenses', url: '/licenses' },
    { name: license.name, url: `/licenses/${type}` },
  ];

  return (
    <MainLayout>
      <PageSEOHead 
        title={`${license.name} - Music Licensing | SongKart`}
        description={license.metaDescription}
        canonical={`https://songkart.com/licenses/${type}`}
      />
      
      <ProductSchema
        name={license.name}
        description={license.metaDescription}
        offers={[{
          name: license.name,
          price: parseInt(license.price.replace(/[^0-9]/g, '') || '0', 10),
          currency: 'INR',
        }]}
      />
      
      <FAQSchema items={license.faqs} />

      <div className="container mx-auto px-4 py-8">
        <SEOBreadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Hero Section */}
        <header className="mb-12">
          <Badge variant="outline" className="mb-4">{type.toUpperCase()}</Badge>
          <h1 className="text-4xl font-bold mb-4">{license.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">{license.description}</p>
          <p className="text-2xl font-semibold text-primary mt-4">{license.price}</p>
        </header>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What's Included</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="grid md:grid-cols-2 gap-4">
                {license.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Use Cases */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Perfect For</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {license.useCases.map((useCase, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="text-primary mb-2">{useCase.icon}</div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {license.faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 bg-muted/30 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Ready to License Music?</h2>
          <p className="text-muted-foreground mb-6">
            Browse our catalog of copyright-safe tracks and find the perfect sound for your project.
          </p>
          <Link to="/browse">
            <Button size="lg">
              <Download className="mr-2 h-5 w-5" />
              Browse Music
            </Button>
          </Link>
        </section>

        {/* Other Licenses */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Other License Types</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(licenseData)
              .filter(([key]) => key !== type)
              .map(([key, data]) => (
                <Link to={`/licenses/${key}`} key={key}>
                  <Card className="hover:border-primary transition-colors h-full">
                    <CardHeader>
                      <Badge variant="outline" className="w-fit">{key.toUpperCase()}</Badge>
                      <CardTitle className="text-lg">{data.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
                      <p className="text-primary font-medium mt-2">{data.price}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function LicensesOverview() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Licenses', url: '/licenses' },
  ];

  return (
    <MainLayout>
      <PageSEOHead 
        title="Music Licensing Options - Personal, Commercial & Exclusive | SongKart"
        description="Choose the right music license for your project. Personal use for non-commercial content, Commercial for monetized videos & ads, Exclusive for full ownership."
        canonical="https://songkart.com/licenses"
      />

      <div className="container mx-auto px-4 py-8">
        <SEOBreadcrumbs items={breadcrumbs} className="mb-6" />

        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Music Licensing Made Simple</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect license for your project. All licenses include instant download and copyright-safe usage.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {Object.entries(licenseData).map(([key, data]) => (
            <Link to={`/licenses/${key}`} key={key}>
              <Card className="hover:border-primary transition-colors h-full">
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">{key.toUpperCase()}</Badge>
                  <CardTitle>{data.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{data.description}</p>
                  <p className="text-lg font-semibold text-primary">{data.price}</p>
                  <ul className="mt-4 space-y-2">
                    {data.features.slice(0, 4).filter(f => f.included).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <section className="text-center py-12 bg-muted/30 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Not Sure Which License You Need?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Choose Commercial for monetized content and business use. 
            For full ownership and exclusivity, choose Exclusive.
          </p>
          <Link to="/browse">
            <Button size="lg">Start Browsing Music</Button>
          </Link>
        </section>
      </div>
    </MainLayout>
  );
}
