import bcrypt from "bcryptjs";

const hash = "$2b$12$6LxumaVYyb0j6OvhxM6vDuj6ulbIbDTYhiLsO4VNuSxGlSvbgKCLi";
const password = "pcrepair2025";

bcrypt.compare(password, hash).then(result => {
  console.log("Match:", result);
});