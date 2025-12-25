import { MainLayout } from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import WhatYouGet from "@/components/home/WhatYouGet";
import NewUploads from "@/components/home/NewUploads";
import FeaturedSongs from "@/components/home/FeaturedSongs";
import GenreSection from "@/components/home/GenreSection";
import HowItWorks from "@/components/home/HowItWorks";
import LatestReleases from "@/components/home/LatestReleases";
import CTABanner from "@/components/home/CTABanner";

const Index = () => {
  return (
    <MainLayout>
      <HeroSection />
      <WhatYouGet />
      <NewUploads />
      <FeaturedSongs />
      <GenreSection />
      <HowItWorks />
      <LatestReleases />
      <CTABanner />
    </MainLayout>
  );
};

export default Index;
