import { EMAIL_BRAND, EMAIL_BRAND_NAME } from "./brandColors";
import Row from "./Row";

// A branded ink band at the very top of every email: the Design Innsæit wordmark
// on ink with a mint accent rule. Table/inline styles only (email-safe); renders
// without any image asset so branding shows even before a logo PNG is dropped in.
const EmailBrandHeader = () => {
  return (
    <div style={{ margin: "0px auto", maxWidth: 600 }}>
      <Row align="center" border="0" style={{ width: "100%" }}>
        <td
          style={{
            direction: "ltr",
            padding: "24px 40px 20px 40px",
            textAlign: "left",
            backgroundColor: EMAIL_BRAND.ink,
            borderRadius: "8px 8px 0 0",
          }}>
          <div
            style={{
              fontFamily: "Roboto, Helvetica, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              color: EMAIL_BRAND.text,
            }}>
            {EMAIL_BRAND_NAME}
          </div>
          <div
            style={{
              marginTop: 10,
              height: 3,
              width: 44,
              lineHeight: "3px",
              fontSize: 0,
              backgroundColor: EMAIL_BRAND.mint,
            }}
          />
        </td>
      </Row>
    </div>
  );
};

export default EmailBrandHeader;
