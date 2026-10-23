FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgomp1 libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY v7-linked-task-ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY v7-linked-task-ai/ .
ENV PYTHONUNBUFFERED=1
CMD ["python","public_server.py"]
