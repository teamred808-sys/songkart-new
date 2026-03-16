import { useEffect, useState } from "react";
import { apiFetch, API_BASE } from '@/lib/api';
import { useSearchParams } from "react-router-dom";

type SitemapType = "index" | "songs" | "sellers" | "blog" | "pages";

interface SitemapProps {
  type?: SitemapType;
}

const Sitemap = ({ type = "index" }: SitemapProps) => {
  const [xmlContent, setXmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = window.location.origin;
        const sitemapUrl = new URL(
          `${API_BASE}/sitemap`
        );
        
        sitemapUrl.searchParams.set("baseUrl", baseUrl);
        if (type !== "index") {
          sitemapUrl.searchParams.set("type", type);
        }

        const response = await fetch(sitemapUrl.toString(), {
          method: "GET",
          headers: {
            "Accept": "application/xml",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch sitemap: ${response.status}`);
        }

        const xml = await response.text();
        setXmlContent(xml);

        // Set document title for clarity
        document.title = type === "index" ? "Sitemap - SongKart" : `Sitemap ${type} - SongKart`;
      } catch (err) {
        console.error("Error fetching sitemap:", err);
        setError(err instanceof Error ? err.message : "Failed to load sitemap");
      } finally {
        setLoading(false);
      }
    };

    fetchSitemap();
  }, [type]);

  // For search engine crawlers, we want to display raw XML
  // Browsers will render this as preformatted text
  if (loading) {
    return (
      <pre style={{ 
        fontFamily: "monospace", 
        whiteSpace: "pre-wrap",
        padding: "20px",
        backgroundColor: "#f5f5f5"
      }}>
        Loading sitemap...
      </pre>
    );
  }

  if (error) {
    return (
      <pre style={{ 
        fontFamily: "monospace", 
        whiteSpace: "pre-wrap",
        padding: "20px",
        backgroundColor: "#fff0f0",
        color: "#cc0000"
      }}>
        Error loading sitemap: {error}
      </pre>
    );
  }

  // Render XML content directly
  // Use dangerouslySetInnerHTML to preserve XML structure for crawlers
  return (
    <pre 
      style={{ 
        fontFamily: "monospace", 
        whiteSpace: "pre-wrap",
        padding: "20px",
        backgroundColor: "#f8f8f8",
        margin: 0,
        minHeight: "100vh"
      }}
    >
      {xmlContent}
    </pre>
  );
};

export default Sitemap;
