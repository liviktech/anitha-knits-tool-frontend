import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/shared/loader';
import type { ColorConsumptionStandardPayload } from './production-config-queries';

interface AddConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ColorConsumptionStandardPayload) => Promise<boolean>;
  /** Present when editing an existing configuration instead of adding a new one. */
  initial?: ColorConsumptionStandardPayload | null;
  isPending?: boolean;
  /** Server-side error surfaced by the calling mutation. */
  serverError?: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  date: '',
  hdpematerialbag: '',
  basisWeightKg: '',
  whiteKgBasis: '',
  blueKgBasis: '',
  greenKgBasis: '',
  chemicalWeight: '',
};

function toFormStrings(payload: ColorConsumptionStandardPayload) {
  return {
    date: payload.date ?? '',
    hdpematerialbag: String(payload.hdpematerialbag ?? 1),
    basisWeightKg: String(payload.basisWeightKg ?? 25),
    whiteKgBasis: String(payload.whiteKgBasis),
    blueKgBasis: String(payload.blueKgBasis),
    greenKgBasis: String(payload.greenKgBasis),
    chemicalWeight: String(payload.chemicalWeight ?? ''),
  };
}

export function AddConfigurationDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
  isPending = false,
  serverError,
}: AddConfigurationDialogProps) {
  const [form, setForm] = useState(() => (initial ? toFormStrings(initial) : { ...emptyForm, date: todayIso() }));
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial ? toFormStrings(initial) : { ...emptyForm, date: todayIso() });
      setFormError(null);
    }
  }, [open, initial]);

  const setField =
    (key: keyof typeof emptyForm) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({
          ...prev,
          [key]: e.target.value,
        }));
      };

  const handleSubmit = async () => {
    const numericFields = [
      'hdpematerialbag',
      'basisWeightKg',
      'whiteKgBasis',
      'blueKgBasis',
      'greenKgBasis',
      'chemicalWeight',
    ] as const;

    const hasInvalidNumber = numericFields.some((key) => {
      const rawValue = form[key];
      const value = String(rawValue ?? '').trim();
      return value === '' || Number.isNaN(Number(value));
    });

    if (!form.date || hasInvalidNumber) {
      setFormError('Please fill in every field with a valid value.');
      return;
    }

    setFormError(null);

    const ok = await onSubmit({
      date: form.date,
      hdpematerialbag: Number(form.hdpematerialbag),
      basisWeightKg: Number(form.basisWeightKg),
      whiteKgBasis: Number(form.whiteKgBasis),
      blueKgBasis: Number(form.blueKgBasis),
      greenKgBasis: Number(form.greenKgBasis),
      chemicalWeight: Number(form.chemicalWeight),
    });

    if (ok) {
      onOpenChange(false);
    }
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        className="
          w-full
          max-w-xl
          overflow-hidden
          rounded-xl
          border
          border-gray-400
          bg-[#ffffff]
          p-0
          shadow-lg
          sm:max-w-2xl
        "
      >
        {/* ===================================================== */}
        {/* HEADER                                                */}
        {/* ===================================================== */}

        <DialogHeader
          className="
            flex
            flex-row
            items-center
            justify-between
            border-b
            border-gray-200
            bg-[#A8DCAB]
            px-6
            py-3
          "
        >
          <DialogTitle
            className="
              text-[20px]
              font-semibold
              leading-[1.4]
              text-black
            "
          >
            {isEdit ? 'Edit Configuration' : 'Add Configuration'}
          </DialogTitle>

          <div className="flex items-center gap-3 pr-8">
            {/* <Label htmlFor="config-date" className="text-sm font-medium whitespace-nowrap text-black">Date</Label> */}
            <Input
              id="config-date"
              type="date"
              value={form.date}
              onChange={setField('date')}
              disabled={isPending}
              
              aria-label="Configuration date"
              className="w-40 h-8 text-sm bg-white text-[#191c1c]"
            />
          </div>
        </DialogHeader>

        {/* ===================================================== */}
        {/* FORM BODY                                             */}
        {/* ===================================================== */}

        <div className="bg-[#f8faf9] px-6 py-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* ================================================= */}
            {/* HDPE CARD                                          */}
            {/* ================================================= */}

            <div className="rounded-lg border border-[#bfc9c3] bg-white p-4">
              <h3 className="mb-4 border-b border-[#e1e3e2] pb-2 text-[12px] font-semibold uppercase tracking-wide text-[#404945]">
                HDPE Bag Weight (kg)
              </h3>

              <div className="flex flex-col gap-2">
                {/* <Label
                htmlFor="config-hdpe"
                className="
                  text-[12px]
                  font-medium
                  leading-none
                  text-[#404945]
                "
              >
                HDPE 
              </Label> */}

                <Input
                  id="config-hdpe"
                  type="number"
                  step="0.01"
                  placeholder="Enter HDPE weight"
                  value={form.basisWeightKg}
                  onChange={setField('basisWeightKg')}
                  disabled={isPending}
                  className="
                  h-10
                  w-full
                  rounded-lg
                  border-[#bfc9c3]
                  bg-white
                  px-3
                  text-[14px]
                  font-normal
                  text-[#191c1c]
                  shadow-none
                  transition-colors
                  placeholder:text-[#404945]/50
                  focus:border-[#002f23]
                  focus:ring-1
                  focus:ring-[#002f23]
                "
                />
              </div>
            </div>

            {/* ================================================= */}
            {/* CHEMICAL CARD                                      */}
            {/* ================================================= */}

            <div className="rounded-lg border border-[#bfc9c3] bg-white p-4">
              <h3 className="mb-4 border-b border-[#e1e3e2] pb-2 text-[12px] font-semibold uppercase tracking-wide text-[#404945]">
                Chemical (kg)
              </h3>

              <div className="flex flex-col gap-2">
                {/* <Label
                htmlFor="config-chemical"
                className="
                  text-[12px]
                  font-medium
                  leading-none
                  text-[#404945]
                "
              >
                Chemical (kg)
              </Label> */}

                <Input
                  id="config-chemical"
                  type="number"
                  step="0.01"
                  placeholder="Enter chemical weight"
                  value={form.chemicalWeight}
                  onChange={setField('chemicalWeight')}
                  disabled={isPending}
                  className="
                  h-10
                  w-full
                  rounded-lg
                  border-[#bfc9c3]
                  bg-white
                  px-3
                  text-[14px]
                  font-normal
                  text-[#191c1c]
                  shadow-none
                  transition-colors
                  placeholder:text-[#404945]/50
                  focus:border-[#002f23]
                  focus:ring-1
                  focus:ring-[#002f23]
                "
                />
              </div>
            </div>
          </div>
          {/* ================================================= */}
          {/* COLORS CARD â€” White, Blue, Green in one card       */}
          {/* ================================================= */}

          <div className="rounded-lg border border-[#bfc9c3] bg-white p-4">
            <h3 className="mb-4 border-b border-[#e1e3e2] pb-2 text-[12px] font-semibold uppercase tracking-wide text-[#404945]">
              Colors
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* White */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="config-white"
                  className="
                    text-[12px]
                    font-medium
                    leading-none
                    text-[#404945]
                  "
                >
                  White (kg)
                </Label>

                <Input
                  id="config-white"
                  type="number"
                  step="0.01"
                  placeholder="Enter white weight"
                  value={form.whiteKgBasis}
                  onChange={setField('whiteKgBasis')}
                  disabled={isPending}
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border-[#bfc9c3]
                    bg-white
                    px-3
                    text-[14px]
                    font-normal
                    text-[#191c1c]
                    shadow-none
                    transition-colors
                    placeholder:text-[#404945]/50
                    focus:border-[#002f23]
                    focus:ring-1
                    focus:ring-[#002f23]
                  "
                />
              </div>

              {/* Blue */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="config-blue"
                  className="
                    text-[12px]
                    font-medium
                    leading-none
                    text-[#404945]
                  "
                >
                  Blue (kg)
                </Label>

                <Input
                  id="config-blue"
                  type="number"
                  step="0.01"
                  placeholder="Enter blue weight"
                  value={form.blueKgBasis}
                  onChange={setField('blueKgBasis')}
                  disabled={isPending}
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border-[#bfc9c3]
                    bg-white
                    px-3
                    text-[14px]
                    font-normal
                    text-[#191c1c]
                    shadow-none
                    transition-colors
                    placeholder:text-[#404945]/50
                    focus:border-[#002f23]
                    focus:ring-1
                    focus:ring-[#002f23]
                  "
                />
              </div>

              {/* Green */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="config-green"
                  className="
                    text-[12px]
                    font-medium
                    leading-none
                    text-[#404945]
                  "
                >
                  Green (kg)
                </Label>

                <Input
                  id="config-green"
                  type="number"
                  step="0.01"
                  placeholder="Enter green weight"
                  value={form.greenKgBasis}
                  onChange={setField('greenKgBasis')}
                  disabled={isPending}
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border-[#bfc9c3]
                    bg-white
                    px-3
                    text-[14px]
                    font-normal
                    text-[#191c1c]
                    shadow-none
                    transition-colors
                    placeholder:text-[#404945]/50
                    focus:border-[#002f23]
                    focus:ring-1
                    focus:ring-[#002f23]
                  "
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {displayError && (
            <p className="text-xs font-medium text-red-600">
              {displayError}
            </p>
          )}
        </div>

        {/* ===================================================== */}
        {/* FOOTER                                                */}
        {/* ===================================================== */}

        <div
          className="
    flex
    w-full
    items-center
    justify-end
    gap-3
    border-t
    border-gray-200
    bg-white
    px-6
    py-3
  "
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="
      h-9
      rounded-lg
      border-[#bfc9c3]
      bg-transparent
      px-4
      text-[12px]
      font-semibold
      text-[#002f23]
      shadow-none
      hover:bg-[#e1e3e2]
      hover:text-[#002f23]
      focus:ring-2
      focus:ring-[#002f23]
    "
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            className="
      h-9
      rounded-lg
      bg-[#004D40]
      px-4
      text-[12px]
      font-semibold
      text-white
      shadow-sm
      hover:bg-[#00332a]
      focus:ring-2
      focus:ring-[#002f23]
      focus:ring-offset-2
    "
          >
            {isPending && (
              <Loader
                size="sm"
                className="mr-2"
              />
            )}

            {isEdit ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


