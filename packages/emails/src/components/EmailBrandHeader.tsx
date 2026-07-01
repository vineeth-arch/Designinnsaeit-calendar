import { WEBAPP_URL } from "@calcom/lib/constants";

import { EMAIL_BRAND, EMAIL_BRAND_TAGLINE } from "./brandColors";
import Row from "./Row";

// The branded ink header bar at the top of every email: logo image + studio
// tagline + an eyebrow line that carries this email's subtitle. Table/inline
// styles only (email-safe).
const EmailBrandHeader = ({ subtitle }: { subtitle?: React.ReactNode }) => {
  return (
    <div style={{ margin: "0px auto", maxWidth: 600 }}>
      <Row align="center" border="0" style={{ width: "100%" }}>
        <td
          style={{
            direction: "ltr",
            backgroundColor: EMAIL_BRAND.indigo,
            borderRadius: "12px 12px 0 0",
            padding: "20px 28px",
            textAlign: "left",
          }}>
          <img
            src={`${WEBAPP_URL}/emails/logo.png`}
            width="260"
            alt="Design Innsæit"
            style={{ display: "block", border: "0", width: "260px", maxWidth: "70%", height: "auto" }}
          />
          <div
            style={{
              fontFamily: "Roboto, Helvetica, sans-serif",
              color: EMAIL_BRAND.mint,
              fontSize: 12,
              marginTop: 8,
              letterSpacing: "0.03em",
            }}>
            {EMAIL_BRAND_TAGLINE}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "Roboto, Helvetica, sans-serif",
                color: EMAIL_BRAND.mintMuted,
                fontSize: 11,
                marginTop: 4,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}>
              {subtitle}
            </div>
          )}
        </td>
      </Row>
    </div>
  );
};

export default EmailBrandHeader;
