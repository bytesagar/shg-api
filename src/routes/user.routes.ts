import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";

const router = Router();
const userController = new UserController();

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     operationId: getAllUsers
 *     description: Retrieve a list of all registered users.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, userController.getUsers);

/**
 * @openapi
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     operationId: createUser
 *     description: Creates a user within the authenticated user's facility.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - userType
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [admin, user, facility, doctor]
 *               phoneNumber:
 *                 type: string
 *               designation:
 *                 type: string
 *               municipalityId:
 *                 type: string
 *                 format: uuid
 *               userRoleId:
 *                 type: string
 *                 format: uuid
 *               specialization:
 *                 type: string
 *               nmcRegistrationNumber:
 *                 type: string
 *               signatureUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", authMiddleware, authorize(["admin"]), userController.createUser);

export default router;
