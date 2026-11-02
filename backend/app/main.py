
# from fastapi import FastAPI, HTTPException, Request
# from fastapi.responses import PlainTextResponse, StreamingResponse
# from pydantic import BaseModel
# from uuid import uuid4
# from io import BytesIO
# import qrcode

# app = FastAPI(title="Personal NFC Digital Card")

# # Temporary storage: data is lost when the server restarts
# digital_cards = {}


# class CardDetails(BaseModel):
#     name: str
#     mobile: str


# @app.get("/")
# def home():
#     return {"message": "Digital Card API is running!"}


# @app.post("/create-card")
# def create_card(details: CardDetails, request: Request):
#     # Generate a unique ID
#     card_id = uuid4().hex

#     # Store the person's details
#     digital_cards[card_id] = details.model_dump()

#     # Generate the digital card link
#     base_url = str(request.base_url)
#     card_link = f"{base_url}card/{card_id}"

#     # Generate the QR code link
#     qr_code_link = f"{base_url}qr/{card_id}"

#     return {
#         "card_id": card_id,
#         "digital_card_link": card_link,
#         "qr_code_link": qr_code_link
#     }


# @app.get("/card/{card_id}", response_class=PlainTextResponse)
# def view_card(card_id: str):
#     card = digital_cards.get(card_id)

#     if card is None:
#         raise HTTPException(
#             status_code=404,
#             detail="Card not found"
#         )

#     details_text = ""

#     for field, value in card.items():
#         details_text += (
#             f"{field.replace('_', ' ').title()}: {value}\n"
#         )

#     return details_text


# @app.get("/qr/{card_id}")
# def get_qr_code(card_id: str, request: Request):
#     # Check whether the card exists
#     if card_id not in digital_cards:
#         raise HTTPException(
#             status_code=404,
#             detail="Card not found"
#         )

#     # Create a QR code containing the digital card link
#     card_link = f"{request.base_url}card/{card_id}"
#     qr_image = qrcode.make(card_link)

#     # Store the QR image in memory
#     image_buffer = BytesIO()
#     qr_image.save(image_buffer, format="PNG")
#     image_buffer.seek(0)

#     # Return the QR code image
#     return StreamingResponse(
#         image_buffer,
#         media_type="image/png"
#     )


import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.database.database import engine
from app.database.migrations import run_migrations
from app.routes.auth import router as auth_router
from app.routes.cards import router as cards_router
from app.routes.physical_cards import router as physical_cards_router
from app.services.email import email_status, smtp_configured

# Application logs (email delivery, OTP issues) go to the server console.
app_logger = logging.getLogger("tapcard")
if not app_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
    app_logger.addHandler(handler)
    app_logger.setLevel(logging.INFO)
    app_logger.propagate = False


@asynccontextmanager
async def lifespan(_: FastAPI):
    with engine.connect():
        print("PostgreSQL connected successfully!")

    run_migrations()
    print("Database tables are up to date!")

    log = app_logger.info if settings.email_backend == "console" or smtp_configured() else app_logger.error
    log("Email delivery: %s", email_status())
    if settings.dev_demo_activation_code:
        app_logger.warning(
            "DEVELOPMENT MODE: the demo NFC activation code is enabled for testing. "
            "Never set APP_ENV=development or DEV_DEMO_ACTIVATION_CODE in production."
        )
    yield


app = FastAPI(
    title="Digital ID Card API",
    description="Registration and digital visiting card backend",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    # One consistent error shape for the frontend: {"detail": {"code", "message", "fields"}}.
    fields = {}
    for error in exc.errors():
        field = str(error["loc"][-1]) if len(error["loc"]) > 1 else "form"
        message = "Enter a valid email address." if field == "email" else error["msg"].removeprefix("Value error, ")
        fields.setdefault(field, message)
    message = next(iter(fields.values()), "Please check the form and try again.")
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "validation_error", "message": message, "fields": fields}},
    )


app.include_router(auth_router)
app.include_router(cards_router)
app.include_router(physical_cards_router)


@app.get("/")
def home():
    return {"message": "Digital ID Card Backend is running!"}


@app.get("/api/health")
def health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
        email = "console" if settings.email_backend == "console" else ("configured" if smtp_configured() else "not_configured")
        return {"status": "success", "database": "connected", "email": email}
