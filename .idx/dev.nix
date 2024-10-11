{ pkgs, ... }: {
  channel = "stable-23.11"; # or "unstable"
  packages = [
    pkgs.openjdk21
  ];
  idx = {
    extensions = [
      "esbenp.prettier-vscode"
    ];
  };
}