import BrowseByCategory from "../components/BrowseByCategory";
import BestSellingProducts from "../components/BestSellingProducts";
import ExploreProductsSection from "../components/ExploreProductsSection";
import FlashSalesCarousel from "../components/FlashSalesCarousel";
import MusicExperienceBanner from "../components/MusicExperienceBanner";
import NewArrivalSection from "../components/NewArrivalSection";
import ServicesHighlights from "../components/ServicesHighlights";
import Hero from "./Hero";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FlashSalesCarousel />
      <BrowseByCategory />
      <BestSellingProducts />
      <MusicExperienceBanner />
      <ExploreProductsSection />
      <NewArrivalSection />
      <ServicesHighlights />
    </>
  );
}
