import express from "express";
import MyUserController from "../controllers/MyUserController";
import {jwtCheck, jwtParse} from "../middleware/auth"
import { validatMyUserRequest } from "../middleware/validation";

const router = express.Router();

//api/my/user
router.get("/", jwtCheck, jwtParse, MyUserController.getCurrentUser);
router.post("/", jwtCheck, MyUserController.createCurrentUser);
router.put("/", jwtCheck, jwtParse, validatMyUserRequest, MyUserController.updateCurrentUser);

export default router;