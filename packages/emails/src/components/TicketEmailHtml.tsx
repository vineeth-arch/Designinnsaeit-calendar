/* eslint-disable @next/next/no-head-element */
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CSSProperties, ReactNode } from "react";
import RawHtml from "./RawHtml";
import type { TicketAction } from "./ticketEmailContent";

// Mirrors the web booking ticket (--cal-bg / --cal-stamp / --cal-brand, light theme).
const C = {
  page: "#EDEAE2",
  paper: "#FBF9F3",
  brand: "#FF006C",
  ink: "#101010",
  subtle: "#6B6B6B",
  rule: "#D6D1C4",
  white: "#FFFFFF",
} as const;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const cell = (style: CSSProperties = {}): CSSProperties => ({
  fontFamily: FONT,
  wordBreak: "break-word",
  ...style,
});

const Table = ({
  children,
  bg,
  style,
  width = "100%",
  ...rest
}: {
  children: ReactNode;
  bg?: string;
  style?: CSSProperties;
  width?: string | number;
  "data-ticket"?: string;
}) => (
  <table
    role="presentation"
    width={width}
    cellPadding={0}
    cellSpacing={0}
    border={0}
    bgcolor={bg}
    style={{ borderCollapse: "separate", ...(bg ? { backgroundColor: bg } : {}), ...style }}
    {...rest}>
    <tbody>{children}</tbody>
  </table>
);

const Caption = ({ children }: { children: ReactNode }) => (
  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.brand }}>{children}</span>
);

const JoinButton = ({ href, label }: { href: string; label: string }) => (
  <>
    <RawHtml
      html={`<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="${C.brand}"><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${label}</center></v:roundrect><![endif]--><!--[if !mso]><!-->`}
    />
    <Table width="auto" style={{ margin: "0 auto" }}>
      <tr>
        <td style={{ backgroundColor: C.brand, borderRadius: 8 }}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="ticket-email-join"
            style={{
              display: "inline-block",
              padding: "12px 26px",
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 700,
              color: C.white,
              textDecoration: "none",
              borderRadius: 8,
            }}>
            {label}
          </a>
        </td>
      </tr>
    </Table>
    <RawHtml html="<!--<![endif]-->" />
  </>
);

const ActionGrid = ({ actions }: { actions: TicketAction[] }) => {
  if (actions.length === 0) return null;
  const rows: TicketAction[][] = [];
  for (let i = 0; i < actions.length; i += 2) rows.push(actions.slice(i, i + 2));
  return (
    <Table style={{ borderSpacing: 8 }}>
      {rows.map((row) => (
        <tr key={row.map((a) => a.label).join("|")}>
          {row.map((action) => (
            <td
              key={action.label}
              colSpan={row.length === 1 ? 2 : 1}
              width={row.length === 1 ? "100%" : "50%"}
              align="center"
              data-testid="ticket-email-action"
              style={cell({
                backgroundColor: C.paper,
                border: `1px solid ${C.brand}`,
                borderRadius: 8,
                padding: "10px 8px",
              })}>
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.ink,
                  textDecoration: "none",
                }}>
                {action.label}
              </a>
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
};

export const TicketEmailHtml = (props: {
  subject: string;
  preheader: string;
  label: string;
  eventName: string;
  dateText: string;
  timeText: string;
  durationText: string | null;
  timezoneText: string;
  heroRight: ReactNode;
  joinUrl: string | null;
  joinLabel: string;
  appointmentCaption: string;
  manageCaption: string;
  withLabel: string;
  withText: string | null;
  locationLabel: string;
  locationText: string | null;
  detailsLabel: string;
  details: ReactNode;
  actions: TicketAction[];
  footerText: string;
}) => (
  <>
    <RawHtml html="<!doctype html>" />
    <html lang="en">
      <head>
        <title>{props.subject}</title>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Dark-mode clients otherwise invert the paper/pink palette into low-contrast mush. */}
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <style type="text/css">{`body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}`}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: C.page }}>
        <div
          style={{
            display: "none",
            maxHeight: 0,
            overflow: "hidden",
            opacity: 0,
            fontSize: 1,
            lineHeight: 1,
          }}>
          {props.preheader}
        </div>
        <Table bg={C.page} data-ticket="1">
          <tr>
            <td align="center" style={{ padding: "32px 12px" }}>
              <Table style={{ maxWidth: 600 }} width={600}>
                <tr>
                  <td
                    style={cell({
                      paddingBottom: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: C.ink,
                      textAlign: "center",
                    })}>
                    DESIGN INNSÆIT
                  </td>
                </tr>
                <tr>
                  <td style={{ lineHeight: 0, fontSize: 0 }}>
                    <img
                      src={`${WEBAPP_URL}/emails/ticket-edge-top.png`}
                      width="600"
                      height="12"
                      alt=""
                      style={{ display: "block", width: "100%", height: "auto", border: 0 }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ backgroundColor: C.paper, padding: "20px 24px 24px" }}>
                    {/* Header band */}
                    <Table bg={C.brand} style={{ borderRadius: 12 }}>
                      <tr>
                        <td
                          width="34%"
                          valign="middle"
                          style={cell({
                            padding: "18px 12px 18px 20px",
                            fontSize: 24,
                            fontWeight: 800,
                            lineHeight: "28px",
                            color: C.white,
                          })}>
                          {props.label}
                        </td>
                        <td valign="middle" style={cell({ padding: "18px 20px 18px 12px", color: C.white })}>
                          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: "21px" }}>
                            {props.eventName}
                          </div>
                          <div style={{ fontSize: 12, marginTop: 6, color: "#FFE3EE" }}>{props.dateText}</div>
                        </td>
                      </tr>
                    </Table>

                    {/* Hero: time + duration | starts-in */}
                    <Table style={{ marginTop: 24 }}>
                      <tr>
                        <td
                          width="50%"
                          align="center"
                          valign="middle"
                          style={cell({ padding: "0 8px 20px" })}>
                          <div
                            style={{
                              fontSize: 44,
                              fontWeight: 800,
                              lineHeight: "46px",
                              letterSpacing: "-0.03em",
                              color: C.ink,
                            }}>
                            {props.timeText}
                          </div>
                          {props.durationText && (
                            <div style={{ fontSize: 14, marginTop: 6, color: C.subtle }}>
                              {props.durationText}
                            </div>
                          )}
                          <div style={{ fontSize: 11, marginTop: 4, color: C.subtle }}>
                            {props.timezoneText}
                          </div>
                        </td>
                        <td
                          width="50%"
                          align="center"
                          valign="middle"
                          style={cell({ padding: "0 8px 20px" })}>
                          {props.heroRight}
                        </td>
                      </tr>
                      {/* Perforation + captions */}
                      <tr>
                        <td
                          align="center"
                          style={cell({ borderTop: `2px dotted ${C.rule}`, padding: "12px 8px 0" })}>
                          <Caption>{props.appointmentCaption}</Caption>
                        </td>
                        <td
                          align="center"
                          style={cell({ borderTop: `2px dotted ${C.rule}`, padding: "12px 8px 0" })}>
                          {props.joinUrl ? (
                            <JoinButton href={props.joinUrl} label={props.joinLabel} />
                          ) : (
                            <Caption>{props.manageCaption}</Caption>
                          )}
                        </td>
                      </tr>
                    </Table>

                    <div style={{ height: 16, lineHeight: "16px", fontSize: 0 }}>&nbsp;</div>
                    <ActionGrid actions={props.actions} />

                    {/* Stub: everything else from the booking */}
                    {(props.withText || props.locationText || props.details) && (
                      <Table style={{ marginTop: 16, borderTop: `2px dotted ${C.rule}` }}>
                        {props.withText && (
                          <tr>
                            <td style={cell({ paddingTop: 16 })}>
                              <div
                                style={{
                                  fontSize: 11,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  color: C.subtle,
                                }}>
                                {props.withLabel}
                              </div>
                              <div style={{ fontSize: 15, marginTop: 4, color: C.ink }}>{props.withText}</div>
                            </td>
                          </tr>
                        )}
                        {props.locationText && (
                          <tr>
                            <td style={cell({ paddingTop: 16 })}>
                              <div
                                style={{
                                  fontSize: 11,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  color: C.subtle,
                                }}>
                                {props.locationLabel}
                              </div>
                              <div style={{ fontSize: 15, marginTop: 4, color: C.ink }}>
                                {props.locationText}
                              </div>
                            </td>
                          </tr>
                        )}
                        {props.details && (
                          <tr>
                            <td style={cell({ paddingTop: 16, fontSize: 14, color: C.ink })}>
                              <div
                                style={{
                                  fontSize: 11,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  color: C.subtle,
                                }}>
                                {props.detailsLabel}
                              </div>
                              {props.details}
                            </td>
                          </tr>
                        )}
                      </Table>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ lineHeight: 0, fontSize: 0 }}>
                    <img
                      src={`${WEBAPP_URL}/emails/ticket-edge-bottom.png`}
                      width="600"
                      height="12"
                      alt=""
                      style={{ display: "block", width: "100%", height: "auto", border: 0 }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={cell({ paddingTop: 16, fontSize: 11, color: C.subtle, textAlign: "center" })}>
                    {props.footerText}
                  </td>
                </tr>
              </Table>
            </td>
          </tr>
        </Table>
      </body>
    </html>
  </>
);
