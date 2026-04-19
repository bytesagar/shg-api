import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import { requireFacilityContext } from "../utils/request-context";
import { telehealthAppointmentCreateSchema } from "../validations/telehealth.validation";
import { TelehealthService } from "../services/telehealth.service";

export class TelehealthController extends BaseController {
  public bookAppointment = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = telehealthAppointmentCreateSchema.safeParse(
        req.body,
      );
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const telehealthService = new TelehealthService(context);
      const result = await telehealthService.bookTelehealthAppointment(
        validatedData.data,
      );

      if ("error" in result) {
        if (result.error === "PATIENT_NOT_FOUND") {
          throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "DOCTOR_NOT_FOUND") {
          throw new AppError("Doctor not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "PROVIDER_NOT_ON_ROSTER") {
          throw new AppError(
            "Selected provider is not on the roster for this facility, date, time, and telehealth service",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
        throw new AppError(
          "Unable to book appointment",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      return this.created(
        res,
        result,
        "Telehealth appointment booked successfully",
      );
    },
  );

  public getJoinLink = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const { id } = req.params;
    const asParam = String(req.query.as || "").toLowerCase();
    const as =
      asParam === "doctor"
        ? "doctor"
        : asParam === "patient"
          ? "patient"
          : null;
    if (!as) {
      throw new AppError(
        "Invalid 'as' query param, expected 'doctor' or 'patient'",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const telehealthService = new TelehealthService(context);
    const result = await telehealthService.getJoinLink({
      appointmentId: id as string,
      as,
    });

    if ("error" in result) {
      let status = HTTP_STATUS.BAD_REQUEST;
      if (result.error === "APPOINTMENT_NOT_FOUND")
        status = HTTP_STATUS.NOT_FOUND;
      if (result.error === "DOCTOR_NOT_FOUND") status = HTTP_STATUS.NOT_FOUND;
      if (result.error === "PATIENT_NOT_FOUND") status = HTTP_STATUS.NOT_FOUND;
      if (result.error === "MEETING_URL_NOT_AVAILABLE")
        status = HTTP_STATUS.BAD_REQUEST;
      throw new AppError("Unable to create join link", status);
    }

    return this.ok(res, result, "Join link generated");
  });
}
