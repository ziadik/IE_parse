export const api = {
  async meta(area) {
    return (await fetch(`/api/area/${area}/meta`)).json();
  },
  async are(area) {
    return (await fetch(`/api/area/${area}`)).json();
  },
  async wed(area) {
    return (await fetch(`/api/area/${area}/wed`)).json();
  },
};
