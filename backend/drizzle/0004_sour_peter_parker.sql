CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"user_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"gender" text,
	"age" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_attendance_session_student_course_unique" UNIQUE("session_id","student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"actual_instructor_id" uuid,
	"actual_assistant_id" uuid,
	"actual_topic" text,
	"actual_date" date NOT NULL,
	"notes" text,
	"executed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_execution_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"source_branch_id" uuid NOT NULL,
	"target_branch_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"transfer_type" text NOT NULL,
	"reason" text,
	"notes" text,
	"created_by" uuid,
	"processed_by" uuid,
	"processed_at" timestamp,
	"rejection_reason" text,
	"expires_at" timestamp NOT NULL,
	"removed_from_groups" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "end_time" text;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD COLUMN "status" text DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "can_manage_transfers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_observations" ADD CONSTRAINT "attendance_observations_attendance_id_session_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."session_attendance"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_observations" ADD CONSTRAINT "attendance_observations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_assistants" ADD CONSTRAINT "group_assistants_group_id_class_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_session_id_group_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_execution" ADD CONSTRAINT "session_execution_session_id_group_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_execution" ADD CONSTRAINT "session_execution_actual_instructor_id_instructors_id_fk" FOREIGN KEY ("actual_instructor_id") REFERENCES "public"."instructors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_execution" ADD CONSTRAINT "session_execution_actual_assistant_id_group_assistants_id_fk" FOREIGN KEY ("actual_assistant_id") REFERENCES "public"."group_assistants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_execution" ADD CONSTRAINT "session_execution_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_source_branch_id_branches_id_fk" FOREIGN KEY ("source_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_target_branch_id_branches_id_fk" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_observations_attendance" ON "attendance_observations" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_attendance_session" ON "session_attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_attendance_student" ON "session_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_attendance_course" ON "session_attendance" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfers_student" ON "student_transfers" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfers_source_branch" ON "student_transfers" USING btree ("source_branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfers_target_branch" ON "student_transfers" USING btree ("target_branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfers_status" ON "student_transfers" USING btree ("status");