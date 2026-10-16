import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export default class TeamsUnreadIndicator {
    constructor() {
        this._button = null;
        this._container = null;
        this._icon = null;
        this._badge = null;
        this._pollSource = null;
    }

    enable() {
        this._button = new PanelMenu.Button(
            0.0,
            'Teams Unread Indicator',
            false
        );

        this._container = new St.BoxLayout({
            style_class: 'teams-unread-indicator-container',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._icon = new St.Label({
            text: 'T',
            style_class: 'teams-unread-indicator-icon',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._badge = new St.Label({
            text: '',
            style_class: 'teams-unread-indicator-badge',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });

        this._container.add_child(this._icon);
        this._container.add_child(this._badge);

        this._button.add_child(this._container);

        this._button.connect('button-press-event', () => {
            this._launchTeams();
        });

        Main.panel.addToStatusArea(
            'teams-unread-indicator',
            this._button,
            0,
            'right'
        );

        this._readState();

        this._pollSource = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            2000,
            () => {
                this._readState();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        if (this._pollSource !== null) {
            GLib.source_remove(this._pollSource);
            this._pollSource = null;
        }

        if (this._button !== null) {
            this._button.destroy();
            this._button = null;
        }

        this._container = null;
        this._icon = null;
        this._badge = null;
    }

    _readState() {
        const statePath = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            'teams-unread-indicator',
            'state.json'
        ]);

        try {
            const [ok, contents] = GLib.file_get_contents(statePath);

            if (!ok)
                throw new Error('State file not available yet');

            const jsonText = new TextDecoder().decode(contents);
            const state = JSON.parse(jsonText);
            const count = Number(state.count);

            if (!Number.isInteger(count) || count < 0)
                throw new Error('Invalid count in state file');

            if (count > 0) {
                const badge = count > 99 ? '99+' : String(count);
                this._badge.set_text(badge);
                this._badge.visible = true;
            } else {
                this._badge.set_text('');
                this._badge.visible = false;
            }

            this._button.tooltip_text =
                count === 0
                    ? 'Microsoft Teams: no unread activity'
                    : `Microsoft Teams: ${count} unread activity item(s)`;

        } catch (_error) {
            this._badge.set_text('');
            this._badge.visible = false;

            this._button.tooltip_text =
                'Microsoft Teams: open the Teams PWA in Chrome to initialize the unread count';
        }
    }

    _launchTeams() {
        const configPath = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'teams-unread-indicator',
            'launcher.json'
        ]);

        try {
            const [ok, contents] = GLib.file_get_contents(configPath);

            if (ok) {
                const jsonText = new TextDecoder().decode(contents);
                const argv = JSON.parse(jsonText);

                if (
                    Array.isArray(argv) &&
                    argv.length > 0 &&
                    argv.every(part => typeof part === 'string')
                ) {
                    Gio.Subprocess.new(
                        argv,
                        Gio.SubprocessFlags.NONE
                    );

                    return;
                }
            }
        } catch (_error) {
            // Fall through to xdg-open.
        }

        try {
            Gio.Subprocess.new(
                [
                    'xdg-open',
                    'https://teams.microsoft.com'
                ],
                Gio.SubprocessFlags.NONE
            );
        } catch (_error) {
            GLib.spawn_command_line_async(
                'xdg-open https://teams.microsoft.com'
            );
        }
    }
}
