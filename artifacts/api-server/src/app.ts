import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadUser } from "./middleware/auth";
import { csrfGuard } from "./middleware/csrf";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load user from JWT cookie on every request (sets req.user / req.userId if valid)
app.use(loadUser);

// CSRF defense-in-depth: verify Origin/Referer for all state-changing requests.
app.use("/api", csrfGuard);

app.use("/api", router);

export default app;
