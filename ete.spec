Name:           ete
Version:        1.0.4
Release:        1.octa%{?dist}
Summary:        ECHO terminal text editor
License:        MIT
URL:            https://github.com/ShadyDevelopment/ECHO-Text-Editor
Source0:        https://github.com/ShadyDevelopment/ECHO-Text-Editor/releases/download/v%{version}-octa/ete-%{version}-octa.tar.gz
BuildArch:      noarch
BuildRequires:  make
BuildRequires:  python3
Requires:       python3 >= 3.8

%description
ETE is a single-file terminal text editor with syntax highlighting, mouse
support, Windows-style keyboard shortcuts, undo/redo, and find/replace. It is
written in Python and has no third-party runtime dependencies.

%prep
%autosetup -n ete-%{version}-octa

%build
:

%check
%make_build check

%install
%make_install PREFIX=%{_prefix} BINDIR=%{_bindir} SYSCONFDIR=%{_sysconfdir}

%files
%license LICENSE
%{_bindir}/ete
%{_mandir}/man1/ete.1*

%changelog
* Thu Oct 01 2026 Antonio Martinovic <antoniomartinovic.business@outlook.com> - 1.0.4-1.octa
- Initial package for ETE 1.0.4-octa.
