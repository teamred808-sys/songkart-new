import { MainLayout } from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import WhatYouGet from "@/components/home/WhatYouGet";
import NewUploads from "@/components/home/NewUploads";
import FeaturedSongs from "@/components/home/FeaturedSongs";
import FreeSongs from "@/components/home/FreeSongs";
import GenreSection from "@/components/home/GenreSection";
import HowItWorks from "@/components/home/HowItWorks";
import LatestReleases from "@/components/home/LatestReleases";
import CTABanner from "@/components/home/CTABanner";
import { useMarkHomepageSeen } from "@/hooks/useFirstVisit";
import { HomeSEOHead } from "@/components/seo/PageSEOHead";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/SchemaOrg";

const Index = () => {
  // Mark homepage as seen when user visits
  useMarkHomepageSeen();

  return (
    <MainLayout>
      <HomeSEOHead />
      <OrganizationSchema />
      <WebSiteSchema />
      <HeroSection />
      <WhatYouGet />
      <NewUploads />
      <FeaturedSongs />
      <FreeSongs />
      <LatestReleases />
      <HowItWorks />
      <GenreSection />
      <CTABanner />
    </MainLayout>
  );
};

export default Index;
