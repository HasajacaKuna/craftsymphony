export function checkAdminPassword(req: Request) {
const pwd = req.headers.get("x-admin-password");
return pwd === "haslo123@";
}