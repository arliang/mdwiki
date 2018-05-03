(function($) {
    var publicMethods = {
        createBasicSkeleton: function() {

            setPageTitle();
            wrapParagraphText();
            linkImagesToSelf();
            groupImages();
            removeBreaks();
            addInpageAnchors ();

            $.md.stage('all_ready').subscribe(function(done) {
                if ($.md.inPageAnchor !== '') {
                    $.md.util.wait(500).then(function () {
                        $.md.scrollToInPageAnchor($.md.inPageAnchor);
                    });
                }
                done();
            });
            return;

        }
    };
    $.md.publicMethods = $.extend ({}, $.md.publicMethods, publicMethods);

    // set the page title to the browser document title, optionally picking
    // the first h1 element as title if no title is given
    function setPageTitle() {
        var $pageTitle;
        var $modifyButton = $('<a id="modify-button" class="edit" href="javascript:void 0"><small class="sub glyphicon glyphicon-edit" title="编辑该页"></small></a>');
        if ($.md.config.title)
            $('title').text($.md.config.title);

        $pageTitle = $('#md-content h1').eq(0);
        if ($.trim($pageTitle.toptext()).length > 0) {
            $('#md-title').prepend($pageTitle);
            var title = $pageTitle.toptext();
            // document.title = title;
        } else {
            $('#md-title').remove();
        }
        $.md.stage('all_ready').subscribe(function(done){
            if($.md.util.isLogin()){ // 没登录不显示编辑按钮
                if($pageTitle.length){
                    $pageTitle.append($modifyButton);
                } else {
                    $('#md-content').prepend($modifyButton);
                }
            }
            done();
        })
        $(document).on('click', '#modify-button', editThisPage)
    }


    // 编辑本页
    function editThisPage () {
        var filePath = location.hash.substr(2);
        filePath = decodeURIComponent(filePath)

        $.ajax({
            url: filePath,
            dataType: 'text',
            success: function(content){
                openStackEditor(filePath, content);
            },
            complete: function(xhr){
                switch(xhr.status){
                    case 404:
                    case 302:
                        openStackEditor(filePath, '新文档\n======')
                }
            }
        });
    }

    function saveChange (filePath, content) {
        filePath = decodeURIComponent(filePath)
        var token, data = {
            title: filePath,
            content: content
        }
        try{
            token = JSON.parse(localStorage.userInfo).token
        } catch(e) {
        }
        if(token){
            data.token = token
        }
        return $.ajax({
            url: '/api/update.php',
            type: 'post',
            data: data
        });
    }

    function openStackEditor (filePath, content) {
        var editor = new Stackedit({url: '/markdown-editor/index.html'});
        editor.openFile({
            name: filePath, // with a filename
            content: {
                text: content // and the Markdown content.
            }
        });

        // Listen to StackEdit events and apply the changes to the textarea.
        editor.on('fileChange', function (file) {
            // file.content.text;
        });

        editor.on('close', function(file){
            $('body').removeClass('stackedit-no-overflow')
        });

        editor.on('save', function(file){
            saveChange(filePath, file.content.text)
            .then(function(data){   
                if(data && data.result && data.code === 5){
                    /**
                     * code: 
                     * 5 未登录
                     * 0 更新成功
                     * 其它，提示msg
                     * 
                     * 1. 需要登录
                     * 2. 文件未变化
                     */

                    $.md.util.showLogin().then(
                        function(){
                            saveChange(filePath, file.content.text)
                        },
                        function(msg){
                            if(msg == 'close'){
                                if($('.stackedit-container').length){
                                    $('.stackedit-container').show()
                                    if(!$('body').is('.stackedit-no-overflow')){
                                        $('body').addClass('stackedit-no-overflow')
                                    }
                                }
                            }
                        },
                        function(msg){
                            window.alert(msg)
                        }
                    )
                } else if(data.code === 0) { // 更新成功
                    window.alert(data.msg);
                    location.reload()
                } else { // 更新失败
                    window.alert(data.msg);
                }
            }, function(){
                $('.stackedit-container').hide()
                if($.md.util.isLogin()){
                    saveChange(filePath, file.content.text)
                    $('body').addClass('stackedit-no-overflow')
                } else {
                    $.md.util.showLogin().then(
                        function(){
                            location.reload();
                        },
                        function(msg){
                            if(msg != 'close'){
                                window.alert(msg)
                            }
                            $('.stackedit-container').show()
                            $('body').addClass('stackedit-no-overflow')
                        },
                        function(msg){
                            window.alert(msg)
                        }
                    )
                }
            });
        });

    } 

    function wrapParagraphText () {
        // TODO is this true for marked.js?

        // markdown gives us sometime paragraph that contain child tags (like img),
        // but the containing text is not wrapped. Make sure to wrap the text in the
        // paragraph into a <div>

		// this also moves ANY child tags to the front of the paragraph!
		$('#md-content p').each (function () {
			var $p = $(this);
			// nothing to do for paragraphs without text
			if ($.trim($p.text ()).length === 0) {
				// make sure no whitespace are in the p and then exit
				//$p.text ('');
				return;
			}
			// children elements of the p
            var children = $p.contents ().filter (function () {
                var $child =  $(this);
                // we extract images and hyperlinks with images out of the paragraph
                if (this.tagName === 'A' && $child.find('img').length > 0) {
                    return true;
                }
                if (this.tagName === 'IMG') {
                    return true;
                }
                // else
                return false;
            });
            var floatClass = getFloatClass($p);
            $p.wrapInner ('<div class="md-text" />');

            // if there are no children, we are done
            if (children.length === 0) {
                return;
            }
            // move the children out of the wrapped div into the original p
            children.prependTo($p);

            // at this point, we now have a paragraph that holds text AND images
            // we mark that paragraph to be a floating environment
            // TODO determine floatenv left/right
            $p.addClass ('md-floatenv').addClass (floatClass);
		});
	}
	function removeBreaks (){
		// since we use non-markdown-standard line wrapping, we get lots of
		// <br> elements we don't want.

        // remove a leading <br> from floatclasses, that happen to
        // get insertet after an image
        $('.md-floatenv').find ('.md-text').each (function () {
            var $first = $(this).find ('*').eq(0);
            if ($first.is ('br')) {
                $first.remove ();
            }
        });

        // remove any breaks from image groups
        $('.md-image-group').find ('br').remove ();
    }
	function getFloatClass (par) {
		var $p = $(par);
		var floatClass = '';

		// reduce content of the paragraph to images
		var nonTextContents = $p.contents().filter(function () {
			if (this.tagName === 'IMG' || this.tagName === 'IFRAME') {
                return true;
            }
			else if (this.tagName === 'A') {
                return $(this).find('img').length > 0;
            }
			else {
				return $.trim($(this).text ()).length > 0;
			}
		});
		// check the first element - if its an image or a link with image, we go left
		var elem = nonTextContents[0];
		if (elem !== undefined && elem !== null) {
			if (elem.tagName === 'IMG' || elem.tagName === 'IFRAME') {
                floatClass = 'md-float-left';
            }
			else if (elem.tagName === 'A' && $(elem).find('img').length > 0) {
                floatClass = 'md-float-left';
            }
			else {
                floatClass = 'md-float-right';
            }
		}
		return floatClass;
	}
    // images are put in the same image group as long as there is
    // not separating paragraph between them
    function groupImages() {
        var par = $('p img').parents('p');
        // add an .md-image-group class to the p
        par.addClass('md-image-group');
    }

    // takes a standard <img> tag and adds a hyperlink to the image source
    // needed since we scale down images via css and want them to be accessible
    // in original format
    function linkImagesToSelf () {
        function selectNonLinkedImages () {
            // only select images that do not have a non-empty parent link
            $images = $('img').filter(function(index) {
                var $parent_link = $(this).parents('a').eq(0);
                if ($parent_link.length === 0) return true;
                var attr = $parent_link.attr('href');
                return (attr && attr.length === 0);
            });
            return $images;
        }
        var $images = selectNonLinkedImages ();
        return $images.each(function() {
            var $this = $(this);
            var img_src = $this.attr('src');
            var img_title = $this.attr('title');
            if (img_title === undefined) {
                img_title = '';
            }
            // wrap the <img> tag in an anchor and copy the title of the image
            $this.wrap('<a class="md-image-selfref" href="' + img_src + '" title="'+ img_title +'"/> ');
        });
    }

    function addInpageAnchors()
    {
        // adds a pilcrow (paragraph) character to heading with a link for the
        // inpage anchor
        function addPilcrow ($heading, href) {
            var c = $.md.config.anchorCharacter;
            var $pilcrow = $('<span class="anchor-highlight"><a>' + c + '</a></span>');
            $pilcrow.find('a').attr('href', href);
            $pilcrow.hide();

            var mouse_entered = false;
            $heading.mouseenter(function () {
                mouse_entered = true;
                $.md.util.wait(300).then(function () {
                    if (!mouse_entered) return;
                    $pilcrow.fadeIn(200);
                });
            });
            $heading.mouseleave(function () {
                mouse_entered = false;
                $pilcrow.fadeOut(200);
            });
            $pilcrow.appendTo($heading);
        }

        // adds a link to the navigation at the top of the page
        function addJumpLinkToTOC($heading) {
            if($.md.config.useSideMenu === false) return;
            if($heading.prop("tagName") !== 'H2') return;

            var c = $.md.config.tocAnchor;
            if (c === '')
                return;

            var $jumpLink = $('<a class="visible-xs visible-sm jumplink" href="#md-page-menu">' + c + '</a>');
            $jumpLink.click(function(ev) {
                ev.preventDefault();

                $('body').scrollTop($('#md-page-menu').position().top);
            });

            if ($heading.parents('#md-menu').length === 0) {
                $jumpLink.insertAfter($heading);
            }
        }

        // adds a page inline anchor to each h1,h2,h3,h4,h5,h6 element
        // which can be accessed by the headings text
        $('h1,h2,h3,h4,h5,h6').not('#md-title h1').each (function () {
            var $heading = $(this);
            $heading.addClass('md-inpage-anchor');
            var text = $heading.clone().children('.anchor-highlight').remove().end().text();
            var href = $.md.util.getInpageAnchorHref(text);
            addPilcrow($heading, href);

            //add jumplink to table of contents
            addJumpLinkToTOC($heading);
        });
    }

    $.md.scrollToInPageAnchor = function(anchortext) {
        if (anchortext.startsWith ('#'))
            anchortext = anchortext.substring (1, anchortext.length);
        // we match case insensitive
        var doBreak = false;
        $('.md-inpage-anchor').each (function () {
            if (doBreak) { return; }
            var $this = $(this);
            // don't use the text of any subnode
            var text = $this.toptext();
            var match = $.md.util.getInpageAnchorText (text);
            if (anchortext === match) {
                this.scrollIntoView (true);
                var navbar_offset = $('.navbar-collapse').height() + 5;
                window.scrollBy(0, -navbar_offset + 5);
                doBreak = true;
            }
        });
    };

}(jQuery));
