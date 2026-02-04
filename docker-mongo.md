
---

## 1 Proper MongoDB “ping” (BEST way)

MongoDB has a built-in ping command.

### From your **host machine** (your case)

```bash
mongosh "mongodb://localhost:27018/mongo" --eval "db.runCommand({ ping: 1 })"
```

✅ If MongoDB is reachable, you’ll see:

```json
{ ok: 1 }
```

---

## 2 Check from inside the MongoDB container (optional)

```bash
docker exec -it mongodb mongosh --eval "db.runCommand({ ping: 1 })"
```

If your container name is different, find it:

```bash
docker ps
```

---

## 🧪 Extra quick checks

### Check port is open

```bash
nc -zv localhost 27018
```

### Check container is running

```bash
docker ps | grep mongo
```

---
