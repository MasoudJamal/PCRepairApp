"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { 
  ArrowLeft, 
  PlusCircle, 
  Building2, 
  MapPin, 
  Phone, 
  Wallet, 
  Percent, 
  Settings,
  Eye,
  Search,
  ChevronRight,
  AlertCircle,
  X
} from "lucide-react";

type ShowroomRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  balance: number | null;
  markup_percent: number | null;
  logo_url: string | null;
  active: boolean;
  currency_code: string;
};

const ShowroomLogo = ({
  logoUrl,
  size = 48,
}: {
  logoUrl?: string | null;
  size?: number;
}) => {
  if (!logoUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <Building2 size={size * 0.5} />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Showroom logo"
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 12,
        background: "#020617",
        flexShrink: 0,
      }}
    />
  );
};

export default function ShowroomsPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { session, loading, setActiveShowroomId } = useSession();

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  const [showrooms, setShowrooms] = useState<ShowroomRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalBalance: 0,
    avgMarkup: 0,
    showroomsWithBalance: 0,
    showroomsWithoutPhone: 0,
  });

  /* 🔒 ACCESS GUARD */
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/login");
      return;
    }

    if (session && session.role !== "admin" && session.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  /* 📥 LOAD SHOWROOMS */
  useEffect(() => {
    if (!session) return;

    const loadShowrooms = async () => {
      setLoadingData(true);

      let query = supabase
        .from("showrooms")
        .select(
          "id, name, address, phone, balance, markup_percent, logo_url, active, currency_code"
        )
        .order("name");

      if (session.role === "manager") {
        query = query.eq("id", session.showroom.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load showrooms", error);
        setLoadingData(false);
        return;
      }

      const showroomsData = data || [];
      setShowrooms(showroomsData);

      // Calculate stats based on ACTUAL data
      const totalBalance = showroomsData.reduce((sum, s) => sum + (s.balance || 0), 0);
      const avgMarkup = showroomsData.length > 0 
        ? showroomsData.reduce((sum, s) => sum + (s.markup_percent || 0), 0) / showroomsData.length
        : 0;
      const showroomsWithBalance = showroomsData.filter(s => (s.balance || 0) > 0).length;
      const showroomsWithoutPhone = showroomsData.filter(s => !s.phone).length;

      setStats({
        totalBalance,
        avgMarkup,
        showroomsWithBalance,
        showroomsWithoutPhone,
      });

      setLoadingData(false);
    };

    loadShowrooms();
  }, [session, supabase]);

  /* 🔍 Filter Showrooms */
  const filteredShowrooms = showrooms.filter(showroom => 
    showroom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    showroom.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    showroom.phone?.includes(searchTerm)
  );

  if (loading || loadingData) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p>{t.common.loading}</p>
      </div>
    );
  }

  const isAdmin = session?.role === "admin";
  const isManager = session?.role === "manager";

  // Helper function to format TND currency with 3 decimal places
 const formatCurrency = (amount: number, currencyCode: string) => {
  return new Intl.NumberFormat(
    lang === 'fr' ? 'fr-FR' : 'en-US',
    {
      style: 'currency',
      currency: currencyCode || 'TND', // fallback if undefined
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }
  ).format(amount);
};
  
   const toggleShowroomActive = async (id: string, current: boolean) => {
  // Optimistic UI update
  setShowrooms(prev =>
    prev.map(s =>
      s.id === id ? { ...s, active: !current } : s
    )
  );

  const { error } = await supabase
    .from("showrooms")
    .update({
      active: !current,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to toggle showroom active state", error);

    // Rollback on error
    setShowrooms(prev =>
      prev.map(s =>
        s.id === id ? { ...s, active: current } : s
      )
    );
  }
};

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <button 
            onClick={() => router.back()}
            style={backButtonStyle}
          >
            <ArrowLeft size={20} />
            <span>{t.common.back}</span>
          </button>

          <div style={headerTitleStyle}>
            <ShowroomLogo
  logoUrl={isManager ? showrooms[0]?.logo_url : null}
  size={150}
/>
            <div>
              <h1 style={titleStyle}>{t.showrooms.title}</h1>
              <p style={subtitleStyle}>
                {isAdmin 
                  ? `${showrooms.length} ${t.showrooms.title.toLowerCase()}` 
                  : t.showrooms.yourShowroom || "Your showroom details"}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={headerActionsStyle}>
            <button
              onClick={() => router.push("/showrooms/create")}
              style={createButtonStyle}
            >
              <PlusCircle size={20} />
              <span>{t.showrooms.create}</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin View */}
      {isAdmin && (
        <div style={adminContainerStyle}>
          {/* Stats Cards - Based on ACTUAL data */}
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statIconStyle("#8b5cf6")}>
                <Building2 size={24} />
              </div>
              <div>
                <h3 style={statValueStyle}>{showrooms.length}</h3>
                <p style={statLabelStyle}>{t.showrooms.totalShowrooms}</p>
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statIconStyle("#10b981")}>
                <Wallet size={24} />
              </div>
              <div>
                <h3 style={statValueStyle}>
                  {formatCurrency(stats.totalBalance)}
                </h3>
                <p style={statLabelStyle}>{t.showrooms.totalBalance}</p>
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statIconStyle("#3b82f6")}>
                <Percent size={24} />
              </div>
              <div>
                <h3 style={statValueStyle}>
                  {stats.avgMarkup.toFixed(1)}%
                </h3>
                <p style={statLabelStyle}>{t.showrooms.averageMarkup}</p>
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statIconStyle("#f59e0b")}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={statValueStyle}>
                  {stats.showroomsWithoutPhone}
                </h3>
                <p style={statLabelStyle}>{t.showrooms.missingPhone}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={searchBarStyle}>
            <div style={searchInputStyle}>
              <Search size={20} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                placeholder={t.showrooms.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInputFieldStyle}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={clearSearchButtonStyle}
                  title={t.showrooms.clearSearch}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Showrooms Grid */}
          {filteredShowrooms.length === 0 ? (
            <div style={emptyStateStyle}>
              <Building2 size={48} style={{ color: "#475569", marginBottom: 16 }} />
              <h3 style={emptyStateTitleStyle}>
                {searchTerm 
                  ? t.showrooms.noResults || "No showrooms found" 
                  : t.showrooms.empty || "No showrooms available"}
              </h3>
              <p style={emptyStateTextStyle}>
                {searchTerm 
                  ? t.showrooms.tryDifferentSearch || "Try adjusting your search criteria"
                  : isAdmin 
                    ? t.showrooms.createFirstPrompt || "Create your first showroom to get started"
                    : t.showrooms.noAssignedShowroom || "No showroom assigned to your account"}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={clearSearchTextButtonStyle}
                >
                  {t.showrooms.clearSearch}
                </button>
              )}
              {!searchTerm && isAdmin && (
                <button
                  onClick={() => router.push("/showrooms/create")}
                  style={createFirstButtonStyle}
                >
                  <PlusCircle size={16} />
                  {t.showrooms.createFirstShowroom}
                </button>
              )}
            </div>
          ) : (
            <div style={showroomsGridStyle}>
              {filteredShowrooms.map((showroom) => (
                <div key={showroom.id} style={showroomCardStyle}>
                  <div style={cardHeaderStyle}>
                    <ShowroomLogo logoUrl={showroom.logo_url} size={100} />
					<button
                    onClick={() =>
                      toggleShowroomActive(showroom.id, showroom.active)
                    }
                    style={statusToggleStyle(showroom.active)}
                  >
                    {showroom.active
                      ? t.showrooms.active
                      : t.showrooms.inactive}
                  </button>
					
                    <div style={cardTitleStyle}>
                      <h3 style={showroomNameStyle}>{showroom.name}</h3>
                      
                    </div>
                  </div>
                  <div style={cardDetailsStyle}>
                    {showroom.address ? (
                      <div style={detailItemStyle}>
                        <MapPin size={16} style={{ color: "#94a3b8" }} />
                        <span style={detailTextStyle}>{showroom.address}</span>
                      </div>
                    ) : (
                      <div style={detailItemStyle}>
                        <MapPin size={16} style={{ color: "#94a3b8" }} />
                        <span style={detailTextStyle}>
                          {t.showrooms.noAddress}
                        </span>
                      </div>
                    )}
                    
                    {showroom.phone ? (
                      <div style={detailItemStyle}>
                        <Phone size={16} style={{ color: "#94a3b8" }} />
                        <span style={detailTextStyle}>{showroom.phone}</span>
                      </div>
                    ) : (
                      <div style={detailItemStyle}>
                        <Phone size={16} style={{ color: "#ef4444" }} />
                        <span style={{...detailTextStyle, color: "#ef4444"}}>
                          {t.showrooms.phoneMissing}
                        </span>
                      </div>
                    )}

                    <div style={metricsGridStyle}>
                      <div style={metricItemStyle}>
                        <Wallet size={16} style={{ color: "#10b981" }} />
                        <div>
                          <div style={metricValueStyle}>
                            {formatCurrency(showroom.balance || 0, showroom.currency_code)}
                          </div>
                          <div style={metricLabelStyle}>{t.showrooms.balance}</div>
                        </div>
                      </div>

                      <div style={metricItemStyle}>
                        <Percent size={16} style={{ color: "#8b5cf6" }} />
                        <div>
                          <div style={metricValueStyle}>
                            {showroom.markup_percent || 0}%
                          </div>
                          <div style={metricLabelStyle}>{t.showrooms.markup}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={cardActionsStyle}>
                    <button
                      onClick={() => router.push(`/showrooms/${showroom.id}`)}
                      style={secondaryButtonStyle}
                    >
                      <Eye size={16} />
                      <span>{t.showrooms.viewDetails}</span>
                    </button>
                    <button
                      onClick={() => router.push(`/showrooms/${showroom.id}/edit`)}
                      style={primaryButtonStyle}
                    >
                      <Settings size={16} />
                      <span>{t.showrooms.manage}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manager View */}
      {isManager && showrooms[0] && (
        <div style={managerContainerStyle}>
          <div style={managerCardStyle}>
            <div style={managerHeaderStyle}>
              <ShowroomLogo
                logoUrl={showrooms[0].logo_url}
                size={100}
              />
              <div>
                <h2 style={managerTitleStyle}>{showrooms[0].name}</h2>
                <p style={managerSubtitleStyle}>
                  {t.showrooms.yourShowroom || "Your assigned showroom"}
                </p>
              </div>
            </div>

            <div style={managerDetailsGridStyle}>
              <div style={detailCardStyle}>
                <div style={detailCardHeaderStyle}>
                  <MapPin size={20} style={{ color: "#94a3b8" }} />
                  <h4 style={detailCardTitleStyle}>{t.showrooms.address}</h4>
                </div>
                <p style={detailCardContentStyle}>
                  {showrooms[0].address || t.showrooms.noAddress}
                </p>
              </div>

              <div style={detailCardStyle}>
                <div style={detailCardHeaderStyle}>
                  <Phone size={20} style={{ color: showrooms[0].phone ? "#94a3b8" : "#ef4444" }} />
                  <h4 style={detailCardTitleStyle}>{t.showrooms.phone}</h4>
                </div>
                <p style={{
                  ...detailCardContentStyle,
                  color: showrooms[0].phone ? "#f8fafc" : "#ef4444"
                }}>
                  {showrooms[0].phone || t.showrooms.noPhone}
                </p>
              </div>

              <div style={detailCardStyle}>
                <div style={detailCardHeaderStyle}>
                  <Wallet size={20} style={{ color: "#10b981" }} />
                  <h4 style={detailCardTitleStyle}>{t.showrooms.balance}</h4>
                </div>
                <div style={balanceValueStyle}>
                 {formatCurrency(showrooms[0].balance || 0, showrooms[0].currency_code)}
                </div>
              </div>

              <div style={detailCardStyle}>
                <div style={detailCardHeaderStyle}>
                  <Percent size={20} style={{ color: "#8b5cf6" }} />
                  <h4 style={detailCardTitleStyle}>{t.showrooms.markup}</h4>
                </div>
                <div style={markupValueStyle}>
                  {showrooms[0].markup_percent || 0}%
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={quickActionsStyle}>
              <h4 style={quickActionsTitleStyle}>
                {t.showrooms.quickActions || "Quick Actions"}
              </h4>
              <div style={quickActionsGridStyle}>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={quickActionButtonStyle}
                >
                  <ChevronRight size={20} />
                  <span>{t.showrooms.goToDashboard}</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => {
                    setActiveShowroomId(showrooms[0].id);
                    router.push(`/showrooms/${showrooms[0].id}/edit`);
				   
                  }}
                  style={quickActionButtonStyle}
                >
                  <Settings size={20} />
                  <span>{t.showrooms.manageSettings}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== STYLES ===== */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#f8fafc",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#0f172a",
  color: "#94a3b8",
};

const spinnerStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  border: "3px solid rgba(255, 255, 255, 0.1)",
  borderTopColor: "#6366f1",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  marginBottom: "16px",
};

const headerStyle: React.CSSProperties = {
  padding: "24px 40px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(15, 23, 42, 0.8)",
  backdropFilter: "blur(10px)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const headerContentStyle: React.CSSProperties = {
  flex: 1,
};

const backButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  padding: "8px 0",
  marginBottom: "12px",
  transition: "color 0.2s",
};

const headerTitleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#94a3b8",
  margin: "4px 0 0 0",
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const createButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 24px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const adminContainerStyle: React.CSSProperties = {
  padding: "40px",
  maxWidth: "1400px",
  margin: "0 auto",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  marginBottom: "32px",
};

const statCardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.5)",
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
};

const statIconStyle = (color: string): React.CSSProperties => ({
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  background: `${color}20`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: color,
});

const statValueStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  color: "#f8fafc",
  margin: 0,
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#94a3b8",
  margin: "4px 0 0 0",
};

const searchBarStyle: React.CSSProperties = {
  marginBottom: "32px",
};

const searchInputStyle: React.CSSProperties = {
  position: "relative",
  maxWidth: "550px",
};

const searchInputFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px 12px 44px",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(15, 23, 42, 0.8)",
  color: "#f8fafc",
  fontSize: "15px",
  outline: "none",
};

const clearSearchButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  padding: "4px",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 40px",
  background: "rgba(30, 41, 59, 0.3)",
  borderRadius: "16px",
  border: "2px dashed rgba(255, 255, 255, 0.1)",
  textAlign: "center",
};

const emptyStateTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 600,
  color: "#f8fafc",
  margin: "0 0 8px 0",
};

const emptyStateTextStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#94a3b8",
  margin: 0,
};

const clearSearchTextButtonStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "transparent",
  color: "#94a3b8",
  fontSize: "14px",
  cursor: "pointer",
};

const createFirstButtonStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const showroomsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
  gap: "24px",
};

const showroomCardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.5)",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  transition: "transform 0.2s, border-color 0.2s",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const showroomIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  flexShrink: 0,
};

const cardTitleStyle: React.CSSProperties = {
  flex: 1,
};

const showroomNameStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#f8fafc",
  margin: "0 0 4px 0",
};

const statusBadgeStyle = (balance: number): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 600,
  background: balance > 0 ? "#10b98120" : "#ef444420",
  color: balance > 0 ? "#10b981" : "#ef4444",
});

const cardDetailsStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const detailItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "12px",
};

const detailTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#94a3b8",
  lineHeight: 1.5,
  flex: 1,
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
  marginTop: "20px",
};

const metricItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#f8fafc",
  lineHeight: 1.2,
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  lineHeight: 1.2,
};

const cardActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
};

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "transparent",
  color: "#94a3b8",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const managerContainerStyle: React.CSSProperties = {
  padding: "40px",
  maxWidth: "1000px",
  margin: "0 auto",
};

const managerCardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.5)",
  borderRadius: "20px",
  padding: "32px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
};

const managerHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  marginBottom: "32px",
};

const managerIconStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  flexShrink: 0,
};

const managerTitleStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  color: "#f8fafc",
  margin: "0 0 4px 0",
};

const managerSubtitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#94a3b8",
  margin: 0,
};

const managerDetailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  marginBottom: "32px",
};

const detailCardStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.8)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
};

const detailCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
};

const detailCardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#94a3b8",
  margin: 0,
};

const detailCardContentStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#f8fafc",
  margin: 0,
  lineHeight: 1.5,
};

const balanceValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#10b981",
  margin: "8px 0 0 0",
};

const markupValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#8b5cf6",
  margin: "8px 0 0 0",
};

const quickActionsStyle: React.CSSProperties = {
  marginTop: "32px",
  paddingTop: "32px",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
};

const quickActionsTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#f8fafc",
  margin: "0 0 20px 0",
};

const quickActionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
};

const quickActionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.03)",
  color: "#f8fafc",
  fontSize: "15px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.2s",
};
const statusToggleStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "6px 14px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  border: "1px solid",
  cursor: "pointer",
  background: active ? "#10b98120" : "#ef444420",
  color: active ? "#10b981" : "#ef4444",
  borderColor: active ? "#10b98155" : "#ef444455",
  transition: "all 0.2s ease",
});

// Add CSS animation for spinner
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Inter', -apple-system, sans-serif;
  }
`;