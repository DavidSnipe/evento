"use client";

import { format } from "date-fns";
import { ro as roLocale } from "date-fns/locale";
import { CalendarIcon, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  createEvent,
  updateEvent,
  type EventFormState,
} from "@/app/(dashboard)/dashboard/events/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildEventTitleFromForm } from "@/lib/events/event-title";
import {
  DIALOG_EVENT_TYPE_OPTIONS,
  isBaptismType,
  isMajoratType,
  isWeddingType,
  normalizeEventType,
  usesGodparentsSection,
  usesManualTitle,
  usesSmartNameFields,
} from "@/lib/events/event-types";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types";
import type { EventRow } from "@/types/events";

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRow | null;
};

const initialState: EventFormState = {};
const TOTAL_STEPS = 3;

export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const boundUpdate = event ? updateEvent.bind(null, event.id) : null;
  const action = isEdit && boundUpdate ? boundUpdate : createEvent;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState<EventType | null>(
    event ? normalizeEventType(event.event_type) : null
  );
  const [date, setDate] = useState<Date | undefined>(
    event?.event_date ? new Date(`${event.event_date}T12:00:00`) : undefined
  );

  const [groomFirstName, setGroomFirstName] = useState(event?.groom_first_name ?? "");
  const [groomLastName, setGroomLastName] = useState(event?.groom_last_name ?? "");
  const [brideFirstName, setBrideFirstName] = useState(event?.bride_first_name ?? "");
  const [brideLastName, setBrideLastName] = useState(event?.bride_last_name ?? "");
  const brideLastAutoFilled = useRef(true);

  const [motherFirstName, setMotherFirstName] = useState(event?.parent1_first_name ?? "");
  const [fatherFirstName, setFatherFirstName] = useState(event?.parent2_first_name ?? "");
  const [familyLastName, setFamilyLastName] = useState(event?.parent1_last_name ?? "");
  const [childFirstName, setChildFirstName] = useState(event?.child_first_name ?? "");

  const [celebratedGender, setCelebratedGender] = useState<"male" | "female">("male");
  const [manualTitle, setManualTitle] = useState(
    event && usesManualTitle(normalizeEventType(event.event_type) ?? "nunta")
      ? event.title
      : ""
  );

  const [venue, setVenue] = useState(event?.venue ?? "");
  const [hasGodparents, setHasGodparents] = useState(
    Boolean(event?.godparent1_name || event?.godparent2_name)
  );
  const [godfatherName, setGodfatherName] = useState(event?.godparent1_name ?? "");
  const [godmotherName, setGodmotherName] = useState(event?.godparent2_name ?? "");

  useEffect(() => {
    if (!open) return;
    if (event) {
      const type = normalizeEventType(event.event_type);
      setEventType(type);
      setStep(1);
      setDate(event.event_date ? new Date(`${event.event_date}T12:00:00`) : undefined);
      setGroomFirstName(event.groom_first_name ?? "");
      setGroomLastName(event.groom_last_name ?? "");
      setBrideFirstName(event.bride_first_name ?? "");
      setBrideLastName(event.bride_last_name ?? "");
      setMotherFirstName(event.parent1_first_name ?? "");
      setFatherFirstName(event.parent2_first_name ?? "");
      setFamilyLastName(event.parent1_last_name ?? "");
      setChildFirstName(event.child_first_name ?? "");
      setManualTitle(type && usesManualTitle(type) ? event.title : "");
      setVenue(event.venue ?? "");
      setHasGodparents(Boolean(event.godparent1_name || event.godparent2_name));
      setGodfatherName(event.godparent1_name ?? "");
      setGodmotherName(event.godparent2_name ?? "");
    } else {
      setStep(1);
      setEventType(null);
      setDate(undefined);
      setGroomFirstName("");
      setGroomLastName("");
      setBrideFirstName("");
      setBrideLastName("");
      setMotherFirstName("");
      setFatherFirstName("");
      setFamilyLastName("");
      setChildFirstName("");
      setManualTitle("");
      setVenue("");
      setHasGodparents(false);
      setGodfatherName("");
      setGodmotherName("");
      brideLastAutoFilled.current = true;
    }
  }, [open, event]);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  const titlePreview = useMemo(() => {
    if (!eventType) return "";
    if (usesSmartNameFields(eventType)) {
      return buildEventTitleFromForm(eventType, {
        groomFirstName,
        brideFirstName,
        parent1FirstName: motherFirstName,
        parent2FirstName: fatherFirstName,
        parentLastName: familyLastName,
        childFirstName,
      });
    }
    return manualTitle.trim();
  }, [
    eventType,
    groomFirstName,
    brideFirstName,
    motherFirstName,
    fatherFirstName,
    familyLastName,
    childFirstName,
    manualTitle,
  ]);

  const showDifferentLastNamesWarning =
    eventType &&
    isWeddingType(eventType) &&
    groomLastName.trim().length > 0 &&
    brideLastName.trim().length > 0 &&
    groomLastName.trim() !== brideLastName.trim();

  const handleGroomLastNameBlur = () => {
    if (!groomLastName.trim()) return;
    if (brideLastAutoFilled.current || !brideLastName.trim()) {
      setBrideLastName(groomLastName);
      brideLastAutoFilled.current = true;
    }
  };

  const handleBrideLastNameChange = (value: string) => {
    brideLastAutoFilled.current = false;
    setBrideLastName(value);
  };

  const canContinueStep1 = Boolean(eventType);
  const canContinueStep2 = useMemo(() => {
    if (!eventType) return false;
    if (isWeddingType(eventType)) {
      return (
        groomFirstName.trim() &&
        groomLastName.trim() &&
        brideFirstName.trim() &&
        brideLastName.trim()
      );
    }
    if (isBaptismType(eventType)) {
      return motherFirstName.trim() && fatherFirstName.trim() && familyLastName.trim();
    }
    if (isMajoratType(eventType)) {
      return groomFirstName.trim().length > 0;
    }
    if (usesManualTitle(eventType)) {
      return manualTitle.trim().length > 0;
    }
    return true;
  }, [
    eventType,
    groomFirstName,
    groomLastName,
    brideFirstName,
    brideLastName,
    motherFirstName,
    fatherFirstName,
    familyLastName,
    manualTitle,
  ]);

  const stepIndicator = ro.events.form.stepIndicator
    .replace("{current}", String(step))
    .replace("{total}", String(TOTAL_STEPS));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="backdrop-blur-sm bg-black/40"
        className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl sm:max-w-lg"
      >
        <DialogHeader className="gap-1">
          <p className="text-xs font-medium text-muted-foreground">{stepIndicator}</p>
          <DialogTitle className="text-xl font-semibold">
            {step === 1
              ? ro.events.form.stepTypeTitle
              : step === 2
                ? ro.events.form.chooseType
                : ro.events.form.date}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? ro.events.editSubtitle : ro.events.createSubtitle}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="skip_redirect" value="true" />
          <input type="hidden" name="event_type" value={eventType ?? ""} />
          <input type="hidden" name="event_date" value={date ? format(date, "yyyy-MM-dd") : ""} />
          {step === 3 ? (
            <>
              <input type="hidden" name="groom_first_name" value={groomFirstName} />
              <input type="hidden" name="groom_last_name" value={groomLastName} />
              <input type="hidden" name="bride_first_name" value={brideFirstName} />
              <input type="hidden" name="bride_last_name" value={brideLastName} />
              <input type="hidden" name="parent1_first_name" value={motherFirstName} />
              <input type="hidden" name="parent1_last_name" value={familyLastName} />
              <input type="hidden" name="parent2_first_name" value={fatherFirstName} />
              <input type="hidden" name="parent2_last_name" value={familyLastName} />
              <input type="hidden" name="child_first_name" value={childFirstName} />
              {usesManualTitle(eventType ?? "nunta") ? (
                <input type="hidden" name="title" value={manualTitle} />
              ) : null}
              <input type="hidden" name="venue" value={venue} />
              {hasGodparents ? <input type="hidden" name="has_godparents" value="on" /> : null}
              <input type="hidden" name="godfather_name" value={godfatherName} />
              <input type="hidden" name="godmother_name" value={godmotherName} />
            </>
          ) : null}

          {step === 1 ? (
            <section className="space-y-3">
              {isEdit && eventType ? (
                <div className="space-y-2">
                  <div className="flex min-h-[80px] items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/8 px-4">
                    <span className="text-2xl" aria-hidden>
                      {DIALOG_EVENT_TYPE_OPTIONS.find((o) => o.value === eventType)?.emoji}
                    </span>
                    <span className="text-sm font-semibold">
                      {DIALOG_EVENT_TYPE_OPTIONS.find((o) => o.value === eventType)?.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ro.events.form.typeReadOnlyNote}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {DIALOG_EVENT_TYPE_OPTIONS.map((option) => {
                    const isSelected = eventType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEventType(option.value)}
                        className={cn(
                          "relative flex h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center transition-all duration-200",
                          isSelected
                            ? "border-2 border-primary bg-primary/8"
                            : "border-border bg-white hover:border-primary/40"
                        )}
                      >
                        <span className="text-xl" aria-hidden>
                          {option.emoji}
                        </span>
                        <span className="text-xs font-medium leading-tight">{option.label}</span>
                        {isSelected ? (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {step === 2 && eventType ? (
            <section className="space-y-5 animate-in fade-in duration-200">
              {isWeddingType(eventType) ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">{ro.events.form.groomSection}</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_groom_last_name">{ro.events.form.groomLastName}</Label>
                        <Input
                          id="dlg_groom_last_name"
                          name="groom_last_name"
                          value={groomLastName}
                          onChange={(e) => setGroomLastName(e.target.value)}
                          onBlur={handleGroomLastNameBlur}
                          required
                          disabled={pending}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_groom_first_name">{ro.events.form.groomFirstName}</Label>
                        <Input
                          id="dlg_groom_first_name"
                          name="groom_first_name"
                          value={groomFirstName}
                          onChange={(e) => setGroomFirstName(e.target.value)}
                          required
                          disabled={pending}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">{ro.events.form.brideSection}</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_bride_last_name">{ro.events.form.brideLastName}</Label>
                        <Input
                          id="dlg_bride_last_name"
                          name="bride_last_name"
                          value={brideLastName}
                          onChange={(e) => handleBrideLastNameChange(e.target.value)}
                          required
                          disabled={pending}
                        />
                        {showDifferentLastNamesWarning ? (
                          <p className="text-xs text-amber-600">
                            ⚠️ {ro.events.form.differentLastNames}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_bride_first_name">{ro.events.form.brideFirstName}</Label>
                        <Input
                          id="dlg_bride_first_name"
                          name="bride_first_name"
                          value={brideFirstName}
                          onChange={(e) => setBrideFirstName(e.target.value)}
                          required
                          disabled={pending}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {isBaptismType(eventType) ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">{ro.events.form.parentsSection}</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_family_last_name">{ro.events.form.familyLastName}</Label>
                        <Input
                          id="dlg_family_last_name"
                          name="parent1_last_name"
                          value={familyLastName}
                          onChange={(e) => setFamilyLastName(e.target.value)}
                          required
                          disabled={pending}
                        />
                        <input type="hidden" name="parent2_last_name" value={familyLastName} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_mother_first_name">{ro.events.form.motherFirstName}</Label>
                        <Input
                          id="dlg_mother_first_name"
                          name="parent1_first_name"
                          value={motherFirstName}
                          onChange={(e) => setMotherFirstName(e.target.value)}
                          required
                          disabled={pending}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_father_first_name">{ro.events.form.fatherFirstName}</Label>
                        <Input
                          id="dlg_father_first_name"
                          name="parent2_first_name"
                          value={fatherFirstName}
                          onChange={(e) => setFatherFirstName(e.target.value)}
                          required
                          disabled={pending}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">{ro.events.form.childFirstName}</h3>
                    <Input
                      id="dlg_child_first_name"
                      name="child_first_name"
                      value={childFirstName}
                      onChange={(e) => setChildFirstName(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                </>
              ) : null}

              {isMajoratType(eventType) ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{ro.events.form.celebratedSection}</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="dlg_celebrated_name">{ro.events.form.celebratedFirstName}</Label>
                    <Input
                      id="dlg_celebrated_name"
                      name="groom_first_name"
                      value={groomFirstName}
                      onChange={(e) => setGroomFirstName(e.target.value)}
                      required
                      disabled={pending}
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="celebrated_gender_ui"
                        checked={celebratedGender === "male"}
                        onChange={() => setCelebratedGender("male")}
                      />
                      {ro.events.form.celebratedMale}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="celebrated_gender_ui"
                        checked={celebratedGender === "female"}
                        onChange={() => setCelebratedGender("female")}
                      />
                      {ro.events.form.celebratedFemale}
                    </label>
                  </div>
                </div>
              ) : null}

              {usesManualTitle(eventType) ? (
                <div className="space-y-1.5">
                  <Label htmlFor="dlg_manual_title">{ro.events.form.eventTitleLabel}</Label>
                  <Input
                    id="dlg_manual_title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder={ro.events.form.titlePlaceholder}
                    required
                    disabled={pending}
                  />
                </div>
              ) : null}

              {titlePreview ? (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {ro.events.form.titlePreviewLabel.replace("{title}", titlePreview)}
                </p>
              ) : null}
            </section>
          ) : null}

          {step === 3 && eventType ? (
            <section className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label>{ro.events.form.date}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                      disabled={pending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: roLocale }) : "Alege o dată"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={roLocale} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dlg_venue">{ro.events.form.venue}</Label>
                <Input
                  id="dlg_venue"
                  name="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder={ro.events.form.venuePlaceholder}
                  disabled={pending}
                />
              </div>

              {usesGodparentsSection(eventType) ? (
                <div className="space-y-3 rounded-xl border p-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="has_godparents"
                      checked={hasGodparents}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasGodparents(checked);
                        if (!checked) {
                          setGodfatherName("");
                          setGodmotherName("");
                        }
                      }}
                    />
                    {ro.events.form.addGodparents}
                  </label>
                  {hasGodparents ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_godfather">{ro.events.form.godfatherFirstName}</Label>
                        <Input
                          id="dlg_godfather"
                          name="godfather_name"
                          value={godfatherName}
                          onChange={(e) => setGodfatherName(e.target.value)}
                          disabled={pending}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dlg_godmother">{ro.events.form.godmotherFirstName}</Label>
                        <Input
                          id="dlg_godmother"
                          name="godmother_name"
                          value={godmotherName}
                          onChange={(e) => setGodmotherName(e.target.value)}
                          disabled={pending}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {state.error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
                {ro.events.form.back}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  pending ||
                  (step === 1 && !canContinueStep1) ||
                  (step === 2 && !canContinueStep2)
                }
              >
                {ro.events.form.continue}
              </Button>
            ) : (
              <Button type="submit" disabled={pending || !date}>
                {pending
                  ? ro.auth.pleaseWait
                  : isEdit
                    ? ro.events.form.saveChanges
                    : ro.events.form.create}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
