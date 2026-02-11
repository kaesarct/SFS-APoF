from firebase_functions import https_fn
from firebase_admin import initialize_app

initialize_app()

@https_fn.on_request()
def api_python(req: https_fn.Request) -> https_fn.Response:
    """Example Python Cloud Function."""
    return https_fn.Response("Hello from Python Backend on Firebase!")
