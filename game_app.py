import os
import threading
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import tkinter as tk
from tkinter import ttk

APP_DIR = os.path.dirname(os.path.abspath(__file__))
URL = "http://localhost:8000"
SERVER = None


def start_server_in_thread():
    global SERVER
    if SERVER is not None:
        return

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=APP_DIR, **kwargs)

    try:
        SERVER = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
        threading.Thread(target=SERVER.serve_forever, daemon=True).start()
        return True
    except OSError:
        return False


def launch_game():
    if start_server_in_thread() is False:
        status_var.set("Порт занят, игра уже запущена")
    else:
        status_var.set("Сервер запущен")
    webbrowser.open(URL)


def on_close():
    global SERVER
    if SERVER is not None:
        try:
            SERVER.shutdown()
            SERVER.server_close()
        except Exception:
            pass
        SERVER = None
    root.destroy()


root = tk.Tk()
root.title("Space Runner App")
root.geometry("420x240")
root.resizable(False, False)
root.configure(bg="#0a1326")

style = ttk.Style()
style.theme_use("clam")
style.configure("TButton", padding=10, font=("Segoe UI", 10, "bold"))
style.configure("TLabel", background="#0a1326", foreground="#eaf7ff", font=("Segoe UI", 11))

header = ttk.Label(root, text="Space Runner")
header.pack(pady=(20, 8))

status_var = tk.StringVar(value="Готово")
status_label = ttk.Label(root, textvariable=status_var)
status_label.pack(pady=(0, 14))

play_button = ttk.Button(root, text="Запустить игру", command=launch_game)
play_button.pack(pady=(0, 10))

close_button = ttk.Button(root, text="Закрыть", command=on_close)
close_button.pack()

root.protocol("WM_DELETE_WINDOW", on_close)
root.mainloop()
