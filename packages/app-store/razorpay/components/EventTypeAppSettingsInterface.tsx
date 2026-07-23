import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import {
  convertFromSmallestToPresentableCurrencyUnit,
  convertToSmallestCurrencyUnit,
  getCurrencySymbol,
} from "@calcom/lib/currencyConversions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select, TextField } from "@calcom/ui/components/form";
import { useEffect, useState } from "react";
import { currencyOptions } from "../lib/currencyOptions";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  eventType,
  getAppData,
  setAppData,
  disabled,
}) => {
  const { t } = useLocale();
  const price = getAppData("price");
  const currency = getAppData("currency") || currencyOptions[0].value;
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) || currencyOptions[0]
  );

  const requirePayment = getAppData("enabled");
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  useEffect(() => {
    if (requirePayment && !currency) {
      setAppData("currency", selectedCurrency.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirePayment, currency]);

  return (
    <>
      {recurringEventDefined ? (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      ) : (
        requirePayment && (
          <>
            <div className="mt-2 block items-center sm:flex">
              <TextField
                label={t("price")}
                labelSrOnly
                addOnLeading={<>{getCurrencySymbol(selectedCurrency.value)}</>}
                addOnSuffix={currency.toUpperCase()}
                step="0.01"
                min="0"
                type="number"
                required
                disabled={disabled}
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", convertToSmallestCurrencyUnit(Number(e.target.value), currency));
                }}
                value={price > 0 ? convertFromSmallestToPresentableCurrencyUnit(price, currency) : undefined}
              />
            </div>
            <div className="mt-5 w-60">
              <label className="text-default block text-sm font-medium" htmlFor="currency">
                {t("currency")}
              </label>
              <Select
                variant="default"
                options={currencyOptions}
                value={selectedCurrency}
                isDisabled={disabled}
                className="text-black"
                defaultValue={selectedCurrency}
                onChange={(e) => {
                  if (e) {
                    setSelectedCurrency(e);
                    setAppData("currency", e.value);
                  }
                }}
              />
            </div>
          </>
        )
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
