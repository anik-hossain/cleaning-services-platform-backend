DROP INDEX "payment_transactions_booking_id_key";

CREATE INDEX "payment_transactions_booking_id_created_at_idx"
ON "payment_transactions"("booking_id", "created_at");

CREATE TABLE "booking_payment_status_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_id" TEXT NOT NULL,
    "previous_status" "PaymentStatus",
    "status" "PaymentStatus" NOT NULL,
    "changed_by" TEXT,

    CONSTRAINT "booking_payment_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_payment_status_history_booking_id_created_at_idx"
ON "booking_payment_status_history"("booking_id", "created_at");

ALTER TABLE "booking_payment_status_history"
ADD CONSTRAINT "booking_payment_status_history_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;