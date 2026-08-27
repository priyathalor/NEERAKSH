export const userState = {
  uid: null,
  phone: null,
  name: null,
  isLoggedIn: false
};

export function setUser(user, name) {
  userState.uid = user.uid;
  userState.phone = user.phoneNumber;
  userState.name = name || userState.name || "";
  userState.isLoggedIn = true;
}

export function clearUser() {
  userState.uid = null;
  userState.phone = null;
  userState.name = null;
  userState.isLoggedIn = false;
}
